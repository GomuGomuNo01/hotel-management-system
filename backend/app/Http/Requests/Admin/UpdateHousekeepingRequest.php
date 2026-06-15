<?php

namespace App\Http\Requests\Admin;

use App\Models\Room;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHousekeepingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'housekeeping_status' => ['required', Rule::in(array_keys(Room::HOUSEKEEPING_STATUSES))],
        ];
    }
}
