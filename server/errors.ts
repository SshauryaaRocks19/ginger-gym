import { DrizzleQueryError } from 'drizzle-orm/errors'

// 23505 code for "this would break a unique constraint"
// pass a constraint name to check for one specific constraint
export function isUniqueViolation(error: unknown, constraint?: string) {
    const cause = error instanceof DrizzleQueryError ? error.cause : undefined
    const pgError = cause as { code?: string; constraint_name?: string } | undefined
    if (pgError?.code !== '23505') {
        return false
    }
    return constraint ? pgError.constraint_name === constraint : true
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