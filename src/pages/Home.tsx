import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { toast } from 'sonner'
import { sendDiscordNotification } from '@/lib/discord'
import { isBefore, isToday } from 'date-fns'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { motion } from 'framer-motion'
import { ChevronDownIcon } from 'lucide-react'
// Adicionando a interface para as apresentações
interface Presentation {
  id: string;
  city: string;
  date: Date;
  time: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

interface CarouselImage {
  id: string
  url: string
  title: string
  description: string
  order: number
  createdAt: Date
}

interface Pilot {
  id: string
  name: string
  position: string
  photoURL: string
  order: number
  createdAt: Date
}

const presentationSchema = z.object({
  city: z.string().min(1, 'Cidade é obrigatória'),
  email: z.string().email('Email inválido'),
  time: z.string().min(1, 'Horário é obrigatório'),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  discordId: z.string().min(1, 'ID do Discord é obrigatório')
})

type PresentationForm = z.infer<typeof presentationSchema>


export default function Home() {
  const [date, setDate] = useState<Date>()
  const [loading, setLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>([])
  const [loadingCarousel, setLoadingCarousel] = useState(true)
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [loadingPilots, setLoadingPilots] = useState(true)

  const form = useForm<PresentationForm>({
    resolver: zodResolver(presentationSchema),
    defaultValues: {
      city: '',
      email: '',
      time: '',
      description: '',
      discordId: ''
    }
  })

  // Referências para as seções
  const heroRef = useRef<HTMLDivElement>(null)
  const aboutRef = useRef<HTMLDivElement>(null)


  // Função para rolagem suave
  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Função para buscar as apresentações aprovadas
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    
    const fetchPresentations = async () => {
      try {
        const presentationsQuery = query(
          collection(db, 'presentations'),
          where('status', '==', 'approved')
        )
        
        unsubscribe = onSnapshot(presentationsQuery, (snapshot) => {
          const presentations = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date.toDate(),
            createdAt: doc.data().createdAt.toDate(),
            city: doc.data().city || '',
            time: doc.data().time || '',
            description: doc.data().description || '',
            status: doc.data().status as 'pending' | 'approved' | 'rejected'
          })) as Presentation[]
          
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          presentations
            .filter(p => isToday(p.date) || isBefore(today, p.date))
            .sort((a, b) => a.date.getTime() - b.date.getTime())
        }, (error) => {
          console.error('Erro ao observar apresentações:', error)
        })
      } catch (error) {
        console.error('Erro ao configurar observador de apresentações:', error)
      }
    }
    
    fetchPresentations()
    
    // Carregar imagens do carrossel
    const carouselQuery = query(collection(db, 'carousel'), orderBy('order', 'asc'))
    const unsubscribeCarousel = onSnapshot(carouselQuery, (snapshot) => {
      const imagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as CarouselImage[]
      setCarouselImages(imagesData)
      setLoadingCarousel(false)
    }, (error) => {
      console.error('Erro ao carregar imagens do carrossel:', error)
      setLoadingCarousel(false)
    })

    // Carregar pilotos
    const pilotsQuery = query(collection(db, 'pilotos'), orderBy('order', 'asc'))
    const unsubscribePilots = onSnapshot(pilotsQuery, (snapshot) => {
      const pilotsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Pilot[]
      setPilots(pilotsData)
      setLoadingPilots(false)
    }, (error) => {
      console.error('Erro ao carregar pilotos:', error)
      setLoadingPilots(false)
    })

    // Limpar o observador quando o componente for desmontado
    return () => {
      unsubscribe()
      unsubscribeCarousel()
      unsubscribePilots()
    }
  }, [])

  const onSubmit = async (data: PresentationForm) => {
    console.log("Função onSubmit chamada", data);
    
    if (!date) {
      toast.error('Selecione uma data para a apresentação')
      return
    }

    try {
      setLoading(true)
      console.log("Enviando dados...", { ...data, date })
      
      // Converter a data para Timestamp do Firestore
      const presentationData = {
        city: data.city,
        email: data.email,
        date: date,
        time: data.time,
        discordId: data.discordId,
        description: data.description,
        status: 'pending',
        createdAt: new Date()
      };
      
      console.log("Dados formatados:", presentationData);
      
      // Salvar no Firestore
      const docRef = await addDoc(collection(db, 'presentations'), presentationData);
      console.log("Documento criado com ID:", docRef.id);
      
      // Enviar notificação para o Discord
      try {
        await sendDiscordNotification({
          ...presentationData,
          id: docRef.id,
          title: '🆕 Nova Solicitação de Apresentação',
        })
      } catch (discordError) {
        console.error("Erro ao enviar notificação para o Discord:", discordError)
      }
      
      toast.success('Solicitação enviada! Entraremos em contato em breve.')
      form.reset()
      setDate(undefined)
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Erro ao enviar:", error)
      toast.error('Erro ao enviar solicitação. Tente novamente mais tarde.')
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="min-h-screen bg-[#0A192F] text-white">
      
      {/* Hero Section */}
      <section id="hero" ref={heroRef} className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://firebasestorage.googleapis.com/v0/b/projeto-testes-6b863.appspot.com/o/carousel%2Fimage.png?alt=media&token=90ee005e-5176-4ffa-954b-9485dce18321')",
            opacity: 0.8
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A192F] to-[#112240] opacity-50"></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 
              className="mb-10 text-5xl md:text-7xl font-bold  bg-gradient-to-b from-white via-blue-300 to-[#0A192F] bg-clip-text text-transparent animate-gradient-y bg-[length:100%_400%]"
             
            >
              Esquadrilha da Fumaça FIVEM
            </h1>
           
            <Button 
              onClick={() => scrollToSection(aboutRef)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg animate-bounce-slow"
            >
              Conheça-nos
              <ChevronDownIcon className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>
      {/* Carousel Section */}
      <section className="py-10 bg-[#0A192F]" id='carousel'>
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative w-full max-w-5xl mx-auto"
          >
            {loadingCarousel ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : carouselImages.length > 0 ? (
              <Carousel className="w-full" opts={{ loop: true }}>
                <CarouselContent>
                  {carouselImages.map((image) => (
                    <CarouselItem key={image.id}>
                      <div className="relative">
                        <img
                          src={image.url}
                          alt={image.title}
                          className="w-full h-full object-cover aspect-video rounded-lg"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
                          <h3 className="text-xl font-bold text-white">{image.title}</h3>
                          <p className="text-sm text-gray-200">{image.description}</p>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">Nenhuma imagem disponível no carrossel.</p>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" ref={aboutRef} className="py-20 bg-[#112240]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <div>
              <h2 className="text-4xl font-bold mb-6">Sobre a Esquadrilha da Fumaça FIVEM</h2>
              <p className="text-gray-300 mb-6 font-alegreya">
                Recriamos com o máximo de fidelidade e respeito, a grandiosidade da Esquadrilha da Fumaça – o Esquadrão de Demonstração Aérea (EDA) da Força Aérea Brasileira (FAB),
                dentro da plataforma do FiveM, fazendo apresentações aéreas para os moradores das cidades dos servidores de RP (Roleplay).
              </p>
              <p className="text-gray-300 mb-6">
                Enquanto os pilotos realizam manobras acrobáticas com precisão milimétrica, temos um locutor em solo que narra toda a apresentação em tempo real, trazendo ao público contexto histórico e detalhes técnicos das manobras. 
              </p>
              <p className="text-gray-300">
                Se você já nos assistiu, sabe do que estamos falando. Se ainda não viu uma de nossas apresentações, convidamos você a nos acompanhar em nossa próxima missão. Prepare-se para assistir a apresentação da Esquadrilha da Fumaça também no FiveM!
              </p>
            </div>
            <div className="relative">
              <img
                src="/logo.png"
                alt="Logo da Esquadrilha da Fumaça"
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pilots Section */}
      <section id="pilots" className="py-20 bg-[#0A192F] relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-12 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-white">
              Pilotos
            </h2>
            
            <div className="relative w-full max-w-4xl mx-auto">
              {/* Formação dos A-29 - Mobile First */}
              <div className="relative h-[600px] sm:h-[500px] flex flex-col items-center">
                {/* Líder */}
                <div className="absolute w-full sm:w-auto text-center" style={{ top: '2%' }}>
                  <div className="relative inline-block">
                    <div className="relative">
                      <p className="text-xs sm:text-sm font-semibold mb-1 text-blue-400">#1 - Líder</p>
                      <p className="text-xs sm:text-sm text-blue-100/80 mb-2">
                        {pilots.find(p => p.position === "1")?.name || ""}
                      </p>
                      <img 
                        src="src/assets/a29.svg" 
                        alt="A-29" 
                        className="w-16 sm:w-24 mx-auto drop-shadow-[0_0_10px_rgba(66,153,225,0.5)]" 
                      />
                    </div>
                  </div>
                </div>

                {/* Segunda Linha (2 e 3) */}
                <div className="absolute w-full flex justify-center gap-20 sm:gap-32" style={{ top: '20%' }}>
                  {/* Ala Esquerdo */}
                  <div className="text-center">
                    <div className="relative">
                      <div className="relative">
                        <p className="text-xs sm:text-sm font-semibold mb-1 text-blue-400 mt-5">#3 - Ala Esquerdo</p>
                        <p className="text-xs sm:text-sm text-blue-100/80 mb-2">
                          {pilots.find(p => p.position === "3")?.name || ""}
                        </p>
                        <img 
                          src="src/assets/a29.svg" 
                          alt="A-29" 
                          className="w-16 sm:w-24 mx-auto drop-shadow-[0_0_10px_rgba(66,153,225,0.5)]" 
                        />
                      </div>
                    </div>
                  </div>
                  {/* Ala Direito */}
                  <div className="text-center">
                    <div className="relative">
                      <div className="relative">
                        <p className="text-xs sm:text-sm font-semibold mb-1 text-blue-400 mt-5">#2 - Ala Direito</p>
                        <p className="text-xs sm:text-sm text-blue-100/80 mb-2">
                          {pilots.find(p => p.position === "2")?.name || ""}
                        </p>
                        <img 
                          src="src/assets/a29.svg" 
                          alt="A-29" 
                          className="w-16 sm:w-24 mx-auto drop-shadow-[0_0_10px_rgba(66,153,225,0.5)]" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terceira Linha (4, 5 e 6) */}
                <div className="absolute w-full flex justify-center gap-8 sm:gap-16" style={{ top: '45%' }}>
                  {/* Ala Esquerdo Externo */}
                  <div className="text-center">
                    <div className="relative">
                      <div className="relative">
                        <p className="text-xs sm:text-sm font-semibold mb-1 text-blue-400 mt-8">#5 - Ala Esquerdo Externo</p>
                        <p className="text-xs sm:text-sm text-blue-100/80 mb-2">
                          {pilots.find(p => p.position === "5")?.name || ""}
                        </p>
                        <img 
                          src="src/assets/a29.svg" 
                          alt="A-29" 
                          className="w-16 sm:w-24 mx-auto drop-shadow-[0_0_10px_rgba(66,153,225,0.5)]" 
                        />
                      </div>
                    </div>
                  </div>
                  {/* Ferrolho */}
                  <div className="text-center">
                    <div className="relative">
                      <div className="relative">
                        <p className="text-xs sm:text-sm font-semibold mb-1 text-blue-400 mt-8">#4 - Ferrolho</p>
                        <p className="text-xs sm:text-sm text-blue-100/80 mb-2">
                          {pilots.find(p => p.position === "4")?.name || ""}
                        </p>
                        <img 
                          src="src/assets/a29.svg" 
                          alt="A-29" 
                          className="w-16 sm:w-24 mx-auto drop-shadow-[0_0_10px_rgba(66,153,225,0.5)]" 
                        />
                      </div>
                    </div>
                  </div>
                  {/* Ala Direito Externo */}
                  <div className="text-center">
                    <div className="relative">
                      <div className="relative">
                        <p className="text-xs sm:text-sm font-semibold mb-1 text-blue-400 mt-8">#6 - Ala Direito Externo</p>
                        <p className="text-xs sm:text-sm text-blue-100/80 mb-2">
                          {pilots.find(p => p.position === "6")?.name || ""}
                        </p>
                        <img 
                          src="src/assets/a29.svg" 
                          alt="A-29" 
                          className="w-16 sm:w-24 mx-auto drop-shadow-[0_0_10px_rgba(66,153,225,0.5)]" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Isolado */}
                <div className="absolute w-full text-center" style={{ top: '78%' }}>
                  <div className="relative inline-block">
                    <div className="relative">
                      <p className="text-xs sm:text-sm font-semibold mb-1 text-blue-400 mt-5">#7 - Isolado</p>
                      <p className="text-xs sm:text-sm text-blue-100/80 mb-2">
                        {pilots.find(p => p.position === "7")?.name || ""}
                      </p>
                      <img 
                        src="src/assets/a29.svg" 
                        alt="A-29" 
                        className="w-16 sm:w-24 mx-auto drop-shadow-[0_0_10px_rgba(66,153,225,0.5)]" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid de pilotos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 mt-16 sm:mt-24">
                {loadingPilots ? (
                  Array.from({ length: 7 }).map((_, index) => (
                    <div key={index} className="bg-blue-900/20 rounded-lg p-3 sm:p-4 backdrop-blur-sm border border-blue-500/20 animate-pulse">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 bg-blue-800/50 rounded-full"></div>
                      <div className="h-3 sm:h-4 bg-blue-800/50 rounded w-3/4 mx-auto mb-2"></div>
                      <div className="h-2 sm:h-3 bg-blue-800/50 rounded w-1/2 mx-auto"></div>
                    </div>
                  ))
                ) : pilots.length > 0 ? (
                  pilots.sort((a, b) => Number(a.position) - Number(b.position)).map((pilot) => (
                    <motion.div
                      key={pilot.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="bg-blue-900/20 rounded-lg p-3 sm:p-4 backdrop-blur-sm border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300"
                    >
                      <div className="relative w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl"></div>
                        <img 
                          src="/src/assets/imgbin-grand-theft-auto-v-rage-rockstar-games-multiplayer-video-game-pilot-x1d9DckkSueP6MBQLdw6RJsXp_t.png" 
                          alt={pilot.name} 
                          className="relative w-full h-full object-cover object-center rounded-full border-2 border-blue-500/50"
                          style={{ objectPosition: '50% 1%' }}
                        />
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-white mb-1">{pilot.name}</h3>
                      <p className="text-xs sm:text-sm text-blue-400">
                        {(() => {
                          switch (pilot.position) {
                            case "1": return "1 - Líder"
                            case "2": return "2 - Ala Direito"
                            case "3": return "3 - Ala Esquerdo"
                            case "4": return "4 - Ferrolho"
                            case "5": return "5 - Ala Esquerdo Externo"
                            case "6": return "6 - Ala Direito Externo"
                            case "7": return "7 - Isolado"
                            default: return pilot.position
                          }
                        })()}
                      </p>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-blue-100/60">
                    Nenhum piloto cadastrado.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

     

      {/* Dialog para solicitação de apresentação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#112240] text-white border-none">
          <DialogHeader>
            <DialogTitle>Solicitar Apresentação</DialogTitle>
            <DialogDescription className="text-gray-400">
              Preencha o formulário abaixo para solicitar uma apresentação.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cidade</label>
              <Input
                {...form.register('city')}
                className="bg-[#0A192F] border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                {...form.register('email')}
                type="email"
                className="bg-[#0A192F] border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="bg-[#0A192F] border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Horário</label>
              <Input
                {...form.register('time')}
                type="time"
                className="bg-[#0A192F] border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ID do Discord</label>
              <Input
                {...form.register('discordId')}
                className="bg-[#0A192F] border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                {...form.register('description')}
                className="bg-[#0A192F] border-gray-700 text-white"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 