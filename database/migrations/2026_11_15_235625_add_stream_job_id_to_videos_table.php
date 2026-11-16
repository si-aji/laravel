<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use PasukanVod\PasukanVod\Support\Database\VideoTable;

return new class extends Migration
{
    public function up(): void
    {
        $tableName = VideoTable::name();

        if (! Schema::hasTable($tableName) || Schema::hasColumn($tableName, 'stream_job_id')) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table): void {
            $table->string('stream_job_id')->nullable()->index('pvod_vid_stream_job_idx');
        });
    }

    public function down(): void
    {
        $tableName = VideoTable::name();

        if (! Schema::hasTable($tableName) || ! Schema::hasColumn($tableName, 'stream_job_id')) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table): void {
            $table->dropIndex('pvod_vid_stream_job_idx');
            $table->dropColumn('stream_job_id');
        });
    }
};
