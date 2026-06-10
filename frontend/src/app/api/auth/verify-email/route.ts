import createLaravelApi from "@/lib/http/laravel";
import { isAxiosError } from "axios";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const schema = z.object({
    id: z.number().int().nonnegative(),
    hash: z.string().min(1),
    expires: z.number().int().nonnegative(),
    signature: z.string(),
});

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const idStr = searchParams.get("id");
    const expiresStr = searchParams.get("expires");
    const result = schema.safeParse({
        id: idStr ? Number(idStr) : null,
        hash: searchParams.get("hash"),
        expires: expiresStr ? Number(expiresStr) : null,
        signature: searchParams.get("signature"),
    });

    if (!result.success) {
        return NextResponse.json({ message: "Неверные данные", errors: result.error }, { status: 422 });
    }

    const laravel = createLaravelApi();

    try {
        const response = await laravel.get(`/email/verify/${result.data.id}/${result.data.hash}`, {
            params: { signature: result.data.signature, expires: result.data.expires },
        });

        return NextResponse.json(response.data);
    } catch (error) {
        if (isAxiosError(error) && error.response) {
            return NextResponse.json(
                { message: error.response.data.message },
                { status: error.response.status },
            );
        }

        return NextResponse.json({ message: "Ошибка сервера" }, { status: 500 });
    }
}
