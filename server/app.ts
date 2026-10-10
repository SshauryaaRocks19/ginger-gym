import { Elysia } from 'elysia'


export const app = new Elysia({ prefix: '/api'})
    .get('/health', ()=>({ ok :true , time: new Date().toISOString()}))