'use client'

import { Barbell, Sneaker } from '@phosphor-icons/react'

export function GymIcons() {
    return (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <Barbell size={110} weight="duotone" className="absolute left-[5%] top-[10%] -rotate-12 text-accent" />
            <Sneaker size={90} weight="duotone" className="absolute bottom-[8%] right-[6%] -rotate-12 text-foreground" />
        </div>
    )
}
