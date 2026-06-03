<?php

namespace App\Http\Requests\Publication;

class UpdatePublicationRequest extends StorePublicationRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }
}
