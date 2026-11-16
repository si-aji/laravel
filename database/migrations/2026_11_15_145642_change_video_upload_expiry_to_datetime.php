<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use PasukanVod\PasukanVod\Support\Database\VideoTable;

return new class extends Migration
{
    public function up(): void
    {
        $tableName = VideoTable::uploadsName();
        if (! Schema::hasTable($tableName) || ! Schema::hasColumn($tableName, 'upload_expires_at')) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table): void {
            $table->dateTime('upload_expires_at')->change();
        });
    }

    public function down(): void
    {
        $tableName = VideoTable::uploadsName();
        if (! Schema::hasTable($tableName) || ! Schema::hasColumn($tableName, 'upload_expires_at')) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table): void {
            $table->timestamp('upload_expires_at')->change();
        });
    }
};
