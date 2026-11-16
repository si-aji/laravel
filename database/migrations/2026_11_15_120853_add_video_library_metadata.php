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
        if (! Schema::hasTable($tableName)) {
            return;
        }

        $columns = [];
        if (! Schema::hasColumn($tableName, 'title')) {
            $columns[] = 'title';
        }
        if (! Schema::hasColumn($tableName, 'description')) {
            $columns[] = 'description';
        }

        if ($columns !== []) {
            Schema::table($tableName, function (Blueprint $table) use ($columns): void {
                foreach ($columns as $column) {
                    match ($column) {
                        'title' => $table->string('title')->nullable(),
                        'description' => $table->text('description')->nullable(),
                    };
                }
            });
        }
    }

    public function down(): void
    {
        $tableName = VideoTable::name();
        if (! Schema::hasTable($tableName)) {
            return;
        }

        foreach (['description', 'title'] as $column) {
            if (Schema::hasColumn($tableName, $column)) {
                Schema::table($tableName, function (Blueprint $table) use ($column): void {
                    $table->dropColumn($column);
                });
            }
        }
    }
};
