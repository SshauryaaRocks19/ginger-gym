'use client'
import { RegisterForm } from "@/components/register-form";
import { LoginForm } from "@/components/login-form";
import { GymIcons } from "@/components/gym-icons";
import { useState, useEffect } from "react";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useUser, homeFor } from "@/lib/user";


export default function SignInPage(){
    const [mode,setMode] = useState<'login'|'register'>('login')
    const router = useRouter()
    const {data:user} = useUser()

    useEffect(()=>{
        if(user){
            router.replace(homeFor(user))
        }
    },[user,router])

    return(

    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
        <GymIcons />
        <div className="text-center">
        <h1 className="text-6xl sm:text-7xl">
            <span className="block text-8xl">🫚</span>
            Ginger Gym
        </h1>
        <p className="mt-2 text-lg font-semibold">Book a session NOW if you wanna get shredded like a ginger</p>
        </div>
        {mode==='login'?
                <LoginForm/>
                : <RegisterForm/>
    }
       <Button variant="ghost" onPress={() => setMode((prevMode) => prevMode === 'login' ? 'register' : 'login')}>{mode==='login'?'New here? Create an Account':'Already have an account? Log In'}</Button>
    </div>

    )
}
