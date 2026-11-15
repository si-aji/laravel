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
        if (! Schema::hasColumn($tableName, 'owner_id')) {
            $columns[] = 'owner_id';
        }
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
                        'owner_id' => $table->string('owner_id', 191)->nullable(),
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

        foreach (['description', 'title', 'owner_id'] as $column) {
            if (Schema::hasColumn($tableName, $column)) {
                Schema::table($tableName, function (Blueprint $table) use ($column): void {
                    $table->dropColumn($column);
                });
            }
        }
    }
};
