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
        $videoTable = VideoTable::name();
        if (Schema::hasTable($videoTable)) {
            $hadOwnerId = Schema::hasColumn($videoTable, 'owner_id');
            $columns = [];
            if (! Schema::hasColumn($videoTable, 'owner_type')) {
                $columns[] = 'owner_type';
            }
            if (! Schema::hasColumn($videoTable, 'owner_id')) {
                $columns[] = 'owner_id';
            }

            if ($columns !== []) {
                Schema::table($videoTable, function (Blueprint $table) use ($columns): void {
                    foreach ($columns as $column) {
                        if ($column === 'owner_type') {
                            $table->string('owner_type')->nullable();
                        } else {
                            $table->string('owner_id')->nullable();
                        }
                    }
                });
            }

            if ($hadOwnerId && Schema::hasColumn($videoTable, 'owner_type')) {
                DB::table($videoTable)
                    ->whereNull('owner_type')
                    ->update(['owner_type' => 'App\\Models\\User']);
            }

            if (Schema::hasColumn($videoTable, 'owner_type')
                && Schema::hasColumn($videoTable, 'owner_id')
                && ! Schema::hasIndex($videoTable, 'pvod_vid_owner_idx')) {
                Schema::table($videoTable, function (Blueprint $table): void {
                    $table->index(['owner_type', 'owner_id'], 'pvod_vid_owner_idx');
                });
            }
        }

        $uploadsTable = VideoTable::uploadsName();
        if (Schema::hasTable($uploadsTable)) {
            $hadOwnerId = Schema::hasColumn($uploadsTable, 'owner_id');
            $columns = [];
            if (! Schema::hasColumn($uploadsTable, 'owner_type')) {
                $columns[] = 'owner_type';
            }
            if (! Schema::hasColumn($uploadsTable, 'owner_id')) {
                $columns[] = 'owner_id';
            }

            if ($columns !== []) {
                Schema::table($uploadsTable, function (Blueprint $table) use ($columns): void {
                    foreach ($columns as $column) {
                        if ($column === 'owner_type') {
                            $table->string('owner_type')->nullable();
                        } elseif ($column === 'owner_id') {
                            $table->string('owner_id')->nullable();
                        }
                    }
                });
            }

            if ($hadOwnerId && Schema::hasColumn($uploadsTable, 'owner_type')) {
                DB::table($uploadsTable)
                    ->whereNull('owner_type')
                    ->update(['owner_type' => 'App\\Models\\User']);
            }

            if (Schema::hasColumn($uploadsTable, 'owner_type')
                && Schema::hasColumn($uploadsTable, 'owner_id')
                && ! Schema::hasIndex($uploadsTable, 'pvod_upl_owner_exp_idx')
                && Schema::hasColumn($uploadsTable, 'upload_expires_at')) {
                Schema::table($uploadsTable, function (Blueprint $table): void {
                    $table->index(['owner_type', 'owner_id', 'upload_expires_at'], 'pvod_upl_owner_exp_idx');
                });
            }
        }
    }

    public function down(): void
    {
        $videoTable = VideoTable::name();
        if (Schema::hasTable($videoTable)
            && Schema::hasIndex($videoTable, 'pvod_vid_owner_idx')) {
            Schema::table($videoTable, function (Blueprint $table): void {
                $table->dropIndex('pvod_vid_owner_idx');
            });
        }

        $uploadsTable = VideoTable::uploadsName();
        if (Schema::hasTable($uploadsTable)
            && Schema::hasIndex($uploadsTable, 'pvod_upl_owner_exp_idx')) {
            Schema::table($uploadsTable, function (Blueprint $table): void {
                $table->dropIndex('pvod_upl_owner_exp_idx');
            });
        }

        foreach ([
            $videoTable => ['owner_id', 'owner_type'],
            $uploadsTable => ['owner_id', 'owner_type'],
        ] as $tableName => $columns) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }

            foreach ($columns as $column) {
                if (Schema::hasColumn($tableName, $column)) {
                    Schema::table($tableName, function (Blueprint $table) use ($column): void {
                        $table->dropColumn($column);
                    });
                }
            }
        }
    }
};
