<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use PasukanVod\PasukanVod\Support\Database\VideoTable;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(VideoTable::name(), function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->nullableMorphs('owner', 'pvod_vid_owner');
            $table->string('disk');
            $table->string('path');
            $table->string('original_filename');
            $table->string('mime_type', 255);
            $table->unsignedBigInteger('size');
            $table->string('status', 32)->default('ready');
            $table->boolean('publish_after_upload')->default(false);
            $table->boolean('is_published')->default(false);
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index('status', 'pvod_vid_status_idx');
            $table->index(['owner_type', 'owner_id'], 'pvod_vid_owner_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists(VideoTable::name());
    }
};
