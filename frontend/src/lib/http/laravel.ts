import axios from "axios"
import { ApiError } from "./api-errors";

export default function createLaravelApi(accessToken?: string | null){
    const baseURL = process.env.NEXT_PUBLIC_LARAVEL_API_URL
    if(!baseURL){
        throw new Error('Laravel API no defined')
    }

    return axios.create({
        baseURL,
        headers:{
            Accept:"application/json",
            ...(accessToken? {Authorization: `Bearer ${accessToken}`} : {})
        }
    })

    
}


