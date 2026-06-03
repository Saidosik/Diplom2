<?php

return [
    'uploads' => [
        'chat' => [
            'max_files' => (int) env('CHAT_MAX_FILES', 5),
            'max_file_kb' => (int) env('CHAT_MAX_FILE_KB', 10240),
            'allowed_mimetypes' => [
                'image/jpeg',
                'image/png',
                'image/webp',
                'image/gif',
                'application/pdf',
                'text/plain',
                'text/markdown',
                'application/zip',
                'application/x-zip-compressed',
                'application/json',
                'text/csv',
                'audio/mpeg',
                'audio/ogg',
                'video/mp4',
                'video/webm',
            ],
        ],

        'user_files' => [
            'max_file_kb' => (int) env('USER_FILE_MAX_FILE_KB', 20480),
            'allowed_mimetypes' => [
                'image/jpeg',
                'image/png',
                'image/webp',
                'image/gif',
                'application/pdf',
                'text/plain',
                'text/markdown',
                'application/zip',
                'application/x-zip-compressed',
                'application/json',
                'text/csv',
                'text/xml',
                'application/xml',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ],
        ],
        'avatar' => [
            'max_file_kb' => (int) env('AVATAR_MAX_FILE_KB', 2048),
            'allowed_mimes' => ['jpg', 'jpeg', 'png', 'webp'],
        ],
    ],

    'playground' => [
        'max_code_chars' => (int) env('PLAYGROUND_MAX_CODE_CHARS', 30000),
        'max_stdin_chars' => (int) env('PLAYGROUND_MAX_STDIN_CHARS', 8000),
        'max_output_chars' => (int) env('PLAYGROUND_MAX_OUTPUT_CHARS', 20000),
    ],
];
