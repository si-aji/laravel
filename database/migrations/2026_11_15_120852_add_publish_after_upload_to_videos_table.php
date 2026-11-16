<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PasukanVod\PasukanVod\Support\Database\VideoTable;

return new class extends Migration
{
    public function up(): void
    {
        $tableName = VideoTable::name();

        if (! Schema::hasTable($tableName) || Schema::hasColumn($tableName, 'publish_after_upload')) {
            return;
        }

        $columnDefinition = DB::connection()->getDriverName() === 'mysql'
            ? 'TINYINT(1) NOT NULL DEFAULT 0'
            : 'BOOLEAN NOT NULL DEFAULT FALSE';
        $quote = DB::connection()->getDriverName() === 'mysql' ? '`' : '"';

        DB::statement(sprintf(
            'ALTER TABLE %1$s%2$s%1$s ADD COLUMN %1$spublish_after_upload%1$s %3$s',
            $quote,
            $tableName,
            $columnDefinition,
        ));
    }

    public function down(): void
    {
        $tableName = VideoTable::name();

        if (! Schema::hasTable($tableName) || ! Schema::hasColumn($tableName, 'publish_after_upload')) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table): void {
            $table->dropColumn('publish_after_upload');
        });
    }
};
