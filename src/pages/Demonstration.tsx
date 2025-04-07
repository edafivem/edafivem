import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { 
  UsersIcon, 
  ArrowRightIcon,
  CalendarIcon,
  ArrowLeftIcon,
  ShieldCheckIcon
} from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { db } from '@/lib/firebase'
import { collection, addDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { sendDiscordNotification } from '@/lib/discord'
import { useNavigate } from 'react-router-dom'

// Componentes de animação
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6 }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const bounce = {
  initial: { y: 0 },
  animate: {
    y: [0, -8, 0],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

const presentationSchema = z.object({
  city: z.string().min(1, 'Cidade é obrigatória'),
  email: z.string().min(1, 'Email ou Discord é obrigatório'),
  time: z.string().min(1, 'Horário é obrigatório'),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres')
})

type PresentationForm = z.infer<typeof presentationSchema>

export default function Demonstration() {
  const [date, setDate] = useState<Date>()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const form = useForm<PresentationForm>({
    resolver: zodResolver(presentationSchema),
    defaultValues: {
      city: '',
      email: '',
      time: '',
      description: ''
    }
  })

  const onSubmit = async (data: PresentationForm) => {
    if (!date) {
      toast.error('Selecione uma data para a apresentação')
      return
    }

    try {
      setLoading(true)
      
      const presentationData = {
        city: data.city,
        email: data.email,
        date: date,
        time: data.time,
        description: data.description,
        status: 'pending',
        createdAt: new Date()
      }
      
      // Salvar no Firestore
      const docRef = await addDoc(collection(db, 'presentations'), presentationData)
      
      // Enviar notificação para o Discord
      try {
        await sendDiscordNotification({
          ...presentationData,
          id: docRef.id,
          title: '🆕 Nova Solicitação de Demonstração'
        })
      } catch (error) {
        console.error("Erro ao enviar notificação para o Discord:", error)
      }
      
      toast.success('Solicitação enviada! Entraremos em contato em breve.')
      form.reset()
      setDate(undefined)
    } catch (error) {
      console.error("Erro ao enviar:", error)
      toast.error('Erro ao enviar solicitação. Tente novamente mais tarde.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Botão Voltar */}
      <div className="container mx-auto px-4 py-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Voltar para a página inicial
        </Button>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted py-12 md:py-24">
        {/* Padrão de fundo */}
        <div className="absolute inset-0 bg-[url('https://media.discordapp.net/attachments/1341881069841940565/1356737453536579844/image.png?ex=67f43f37&is=67f2edb7&hm=5b4886b76bc42d1574d8453322c993a7cc2a6db52041d0d5d1824c2e9d3077b6&=&format=webp&quality=lossless&width=550&height=309')] opacity-50 bg-cover bg-center"></div>
        
        <div className="container relative mx-auto px-4">
          <div className="grid place-items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Solicite uma Demonstração
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Traga a apresentação aérea da Esquadrilha da Fumaça para seu servidor.
              </p>
              <motion.div
                initial="initial"
                animate="animate"
                variants={bounce}
              >
                <Button
                  size="lg"
                  onClick={() => {
                    const element = document.getElementById('como-funciona')
                    element?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="group bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Solicitar agora
                  <ArrowRightIcon className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Processo de Solicitação */}
      <section id="como-funciona" className="py-24 bg-muted">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-4">Como Funciona</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Entenda o processo para solicitar uma demonstração da Esquadrilha da Fumaça em seu servidor.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-blue-500 font-bold text-xl z-10">
                  1
                </div>
                <Card className="border-2 pt-16 pb-8 px-6 text-center">
                  <h3 className="text-xl font-bold mb-4">Solicitação</h3>
                  <p className="text-muted-foreground">
                    Preencha o formulário abaixo com todas as informações necessárias.
                  </p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-blue-500 font-bold text-xl z-10">
                  2
                </div>
                <Card className="border-2 pt-16 pb-8 px-6 text-center">
                  <h3 className="text-xl font-bold mb-4">Análise</h3>
                  <p className="text-muted-foreground">
                    Nossa equipe entrará em contato com o solicitante e explicará as operações.
                  </p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="relative"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-blue-500 font-bold text-xl z-10">
                  3
                </div>
                <Card className="border-2 pt-16 pb-8 px-6 text-center">
                  <h3 className="text-xl font-bold mb-4">Confirmação</h3>
                  <p className="text-muted-foreground">
                    Após confirmado, nossa equipe enviará os Mods necessários para realizar a demonstração no servidor
                  </p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="relative"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-blue-500 font-bold text-xl z-10">
                  4
                </div>
                <Card className="border-2 pt-16 pb-8 px-6 text-center">
                  <h3 className="text-xl font-bold mb-4">Demonstração</h3>
                  <p className="text-muted-foreground">
                    Realização da apresentação no dia local e horário marcados.
                  </p>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Informações e Requisitos */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Informações */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="space-y-8"
            >
              <motion.div variants={fadeIn}>
                <h2 className="text-3xl font-bold mb-8">Informações Importantes</h2>
                
                <div className="space-y-6">
                  <Card className="border-2 hover:border-primary/50 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <CalendarIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium mb-2">Agendamento Antecipado</h3>
                          <p className="text-muted-foreground">
                            Solicite com pelo menos 7 dias de antecedência.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 hover:border-primary/50 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <ShieldCheckIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium mb-2">Solicitante</h3>
                          <p className="text-muted-foreground">
                            É necessário que o solicitante seja ADM ou CEO do servidor.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 hover:border-primary/50 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <UsersIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium mb-2">Localização</h3>
                          <p className="text-muted-foreground">
                            Recomendamos um local com capacidade para o público esperado.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </motion.div>

            {/* Formulário */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="space-y-8"
            >
              <motion.div variants={fadeIn}>
                <h2 className="text-3xl font-bold mb-8">Solicite Agora</h2>
                
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cidade</label>
                    <Input
                      {...form.register('city')}
                      placeholder="Nome da cidade"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email ou Discord para contato</label>
                    <Input
                      {...form.register('email')}
                      placeholder="Seu email ou usuário do Discord"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data</label>
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      className="border rounded-md p-3"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Horário</label>
                    <Input
                      {...form.register('time')}
                      type="time"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Objetivo do evento</label>
                    <Textarea
                      {...form.register('description')}
                      placeholder="Exemplo: Na cidade haverá um evento importante (7 de setembro)."
                      rows={4}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Enviando...' : 'Enviar Solicitação'}
                  </Button>
                </form>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-24 bg-gradient-to-r from-primary/10 to-blue-500/10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Ainda tem dúvidas?</h2>
            <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8">
              Entre em nosso servidor do Discord para conversar diretamente com nossa equipe 
              e tirar suas dúvidas sobre o processo de solicitação.
            </p>
            <Button size="lg" asChild className="group w-full md:w-auto">
              <a 
                href="https://discord.gg/qEw6ScPVZD" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2"
              >
                <span>Entrar no Discord</span>
                <ArrowRightIcon className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  )
} 