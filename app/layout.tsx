import type { Metadata } from 'next'
import { Fira_Sans } from 'next/font/google'
import '@fontsource/isometra/latin.css'
import { Providers } from './providers'
import './globals.css'

const firaSans = Fira_Sans({
    weight: ['400', '500', '600', '700'],
    subsets: ['latin'],
    variable: '--font-fira-sans',
})

export const metadata: Metadata = {
    title: 'Ginger Gym',
    description: 'Slot booking at ginger gym lol',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
    return (
        <html lang="en" className={`${firaSans.variable} h-full antialiased`}>
            <body className="flex min-h-full flex-col font-sans text-foreground">
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
