import type { Metadata } from 'next'
import { Black_Ops_One, Fira_Sans } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const blackOpsOne = Black_Ops_One({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-black-ops-one',
})

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
        <html lang="en" className={`${blackOpsOne.variable} ${firaSans.variable} h-full antialiased`}>
            <body className="flex min-h-full flex-col font-sans text-foreground">
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
