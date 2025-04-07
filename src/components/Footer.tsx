import { AiOutlineDiscord, AiOutlineInstagram, AiOutlineYoutube } from "react-icons/ai"
import { FaTiktok } from "react-icons/fa"

export default function Footer() {
  return (
    <footer id="contacts" className="border-t w-full bg-[#112240]">
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col items-center justify-center">
          <h4 className="text-2xl font-bold mb-6">Contatos</h4>
          <div className="flex gap-4">
            <a
              href="https://discord.gg/qEw6ScPVZD"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <AiOutlineDiscord size={40} />
            </a>
            <a
              href="https://instagram.com/eda.fivem"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <AiOutlineInstagram size={40} />
            </a>
            <a
              href="https://youtube.com/@edafivem"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <AiOutlineYoutube size={40} />
            </a>
            <a
              href="https://tiktok.com/@eda.fivem"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <FaTiktok size={40} />
            </a>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Esquadrilha da Fumaça FiveM. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}