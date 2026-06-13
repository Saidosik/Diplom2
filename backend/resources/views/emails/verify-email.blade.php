<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Подтверждение email на платформе Вектор</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f8fb; color: #172033; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f6f8fb; padding: 32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; background-color: #ffffff; border-radius: 16px; padding: 32px;">
                    <tr>
                        <td>
                            <h1 style="margin: 0 0 24px; font-size: 24px; line-height: 1.3; color: #172033;">Здравствуйте!</h1>

                            <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">Спасибо за регистрацию на платформе Вектор — веб-сообществе для программистов.</p>

                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6;">Чтобы завершить регистрацию и получить доступ к публикациям, вопросам, профилю, рекомендациям, AI-ассистенту и другим разделам платформы, подтвердите свой email.</p>

                            <p style="margin: 0 0 24px; text-align: center;">
                                <a href="{{ $verificationUrl }}" style="display: inline-block; padding: 14px 24px; border-radius: 10px; background-color: #2563eb; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none;">Подтвердить email</a>
                            </p>

                            <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">Ссылка действительна в течение {{ $expireMinutes }} минут.</p>

                            <p style="margin: 0 0 8px; font-size: 16px; line-height: 1.6;">Если кнопка не работает, скопируйте и откройте ссылку в браузере:</p>
                            <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; word-break: break-all;"><a href="{{ $verificationUrl }}" style="color: #2563eb;">{{ $verificationUrl }}</a></p>

                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6;">Если вы не регистрировались на платформе Вектор, просто проигнорируйте это письмо.</p>

                            <p style="margin: 0; font-size: 16px; line-height: 1.6;">С уважением,<br>команда платформы Вектор</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
