import createLaravelApi from "@/lib/http/laravel";
import { AxiosError, isAxiosError } from "axios";
import { NextRequest, NextResponse } from "next/server";
import z, { safeParse } from "zod";


const schema = z.object({
    id: z.number().int().nonnegative(),
    expires: z.number().int().nonnegative(),
    signature: z.string(),
});


export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const idStr = searchParams.get('id')
    const id = idStr ? Number(idStr) : null
    const expiresStr = searchParams.get('expires')
    const expires = expiresStr ? Number(expiresStr) : null
    const signature = searchParams.get('signature');
    const rawBody = {
        id,
        expires,
        signature
    }
    const result = schema.safeParse(rawBody);
    console.log(result)
    if (!result.success) {
        // Если данные не соответствуют схеме, вернуть ошибку
        return NextResponse.json({ message: 'Неверные данные', errors: result.error }, { status: 422 });
    }
    const laravel = createLaravelApi();
    try {
        await laravel.get(`/email/verify/${result.data.id}`, {
            params: { signature: result.data.signature, expires: result.data.expires }
        });
        return NextResponse.json({ message: 'Почта потверждена' })

    } catch (error) {

        if (isAxiosError(error) && error.response) {
            return NextResponse.json(
                { message: error.response.data.message },
                { status: error.response.status }
            );
        }
        if (isAxiosError(error)) {
            return NextResponse.json({ message: error.response?.data.message ?? "Ошибка сервера", status: 500 })
        }

        return NextResponse.json({ message: "Ошибка сервера", status: 500 })

    }

}