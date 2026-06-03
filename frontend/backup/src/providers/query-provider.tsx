'use client'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode, useState } from "react"
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

type Props = {
    children: ReactNode
}

export function QueryProvider({children}: Props){
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions:{
                    queries:{
                        retry: false,
                        refetchOnWindowFocus: false,
                    },
                    mutations: {
                        retry: false,
                    }
                }
            })
    )

    return(
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    )

}

