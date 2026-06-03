'use client'; // Обязательно для событий onClick

import * as React from "react";
import { useRouter } from 'next/navigation'; // Используем useRouter вместо redirect
import { Button } from "@/components/ui/button";
import { AllowedAuthProviders, AuthProviders } from "@/features/auth/types";
import YandexSVG from "../ui/yandexLogo";
import GoogleSVG from "../ui/googleLogo";

interface AuthButtonsProps {
    providers: AuthProviders;
    onProviderClick?: (provider: AllowedAuthProviders) => void;
}

type SVGProps = React.ComponentPropsWithoutRef<'svg'>;

// Явно типизируем объект через Record, чтобы AllowedAuthProviders мог быть ключом
const providerData: Record<
    AllowedAuthProviders,
    { component: React.ComponentType<SVGProps>; label: string }
> = {
    google: { component: GoogleSVG, label: 'Google' },
    yandex: { component: YandexSVG, label: 'Яндекс' },
};
const AuthSocialButtons = ({ providers, onProviderClick }: AuthButtonsProps) => {
    const router = useRouter();

    const handleDefaultClick = (provider: AllowedAuthProviders) => {
        if (onProviderClick) {
            onProviderClick(provider)
            return
        }

        window.location.href = `/api/auth/oauth/${provider}/redirect`
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="relative flex items-center">
                <div className="grow border-t-2 border-muted"></div>
                <span className="mx-4 shrink text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                    Войти через
                </span>
                <div className="grow border-t-2 border-muted"></div>
            </div>

            <div className="flex items-center justify-center gap-4">
                {providers.map((name) => {
                    const provider = providerData[name];
                    if (!provider) return null;

                    const Icon = provider.component;

                    return (
                        <Button
                            key={name}
                            variant="outline"
                            className="group h-14 w-14 transition-all duration-300 hover:bg-accent"
                            onClick={() => handleDefaultClick(name)}
                            title={`Войти через ${provider.label}`}
                        >
                            <Icon className="filter grayscale opacity-60 size-10 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100" />
                        </Button>
                    );
                })}
            </div>
        </div>
    );
};

export default AuthSocialButtons;
