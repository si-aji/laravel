<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PasukanVod\PasukanVod\Support\Database\VideoTable;
use Tests\TestCase;

class VideoLibraryMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_upgrade_adds_owner_columns_to_existing_video_tables(): void
    {
        $videoTable = VideoTable::name();
        $uploadsTable = VideoTable::uploadsName();

        Schema::dropIfExists($uploadsTable);
        Schema::dropIfExists($videoTable);

        Schema::create($videoTable, function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('disk');
            $table->string('path');
            $table->string('original_filename');
            $table->string('mime_type');
            $table->unsignedBigInteger('size');
            $table->string('status');
            $table->timestamps();
        });
        Schema::create($uploadsTable, function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('owner_id');
            $table->timestamp('upload_expires_at');
        });
        DB::table($uploadsTable)->insert([
            'id' => (string) str()->uuid(),
            'owner_id' => '1',
            'upload_expires_at' => now(),
        ]);

        (require database_path('migrations/2026_11_16_000000_add_owner_columns_to_pasukan_vod_tables.php'))->up();

        $this->assertTrue(Schema::hasColumn($videoTable, 'owner_type'));
        $this->assertTrue(Schema::hasColumn($videoTable, 'owner_id'));
        $this->assertTrue(Schema::hasColumn($uploadsTable, 'owner_type'));
        $this->assertTrue(Schema::hasColumn($uploadsTable, 'owner_id'));
        $this->assertTrue(Schema::hasIndex($videoTable, 'pvod_vid_owner_idx'));
        $this->assertTrue(Schema::hasIndex($uploadsTable, 'pvod_upl_owner_exp_idx'));
        $this->assertSame(
            User::class,
            DB::table($uploadsTable)->value('owner_type'),
        );
    }
}
