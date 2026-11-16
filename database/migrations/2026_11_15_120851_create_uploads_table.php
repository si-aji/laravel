<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use PasukanVod\PasukanVod\Support\Database\VideoTable;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(VideoTable::uploadsName(), function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->nullableMorphs('owner', 'pvod_upl_owner');
            $table->foreignUuid('video_id')->nullable()
                ->references('id')->on(VideoTable::name())->nullOnDelete();
            $table->string('disk');
            $table->string('path');
            $table->string('storage_upload_id', 1024);
            $table->string('original_filename');
            $table->string('mime_type', 255);
            $table->unsignedBigInteger('size');
            $table->timestamp('upload_expires_at');
            $table->timestamps();

            $table->index('upload_expires_at', 'pvod_upl_exp_idx');
            $table->index(['owner_type', 'owner_id', 'upload_expires_at'], 'pvod_upl_owner_exp_idx');
            $table->index('video_id', 'pvod_upl_video_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists(VideoTable::uploadsName());
    }
};
