import { DrizzleQueryError } from 'drizzle-orm/errors'

// 23505 code for "this would break a unique constraint"
export function isUniqueViolation(error: unknown) {
    const cause = error instanceof DrizzleQueryError ? error.cause : undefined
    return (cause as { code?: string } | undefined)?.code === '23505'
}

export class ApiError extends Error{
    status!: number
    code!: string
    
    constructor(status:number, code:string, message:string){
        super(message)
        this.status = status
        this.code = code
    }
}