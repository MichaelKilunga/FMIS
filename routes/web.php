<?php

use Illuminate\Support\Facades\Route;

Route::get('{any}', function () {
    if (file_exists(public_path('index.html'))) {
        return file_get_contents(public_path('index.html'));
    }
    return view('welcome');
})->where('any', '.*');
