<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SpacesFilesystemTest extends TestCase
{
    public function test_spaces_disk_uses_s3_configuration_from_environment(): void
    {
        Config::set('filesystems.disks.spaces.key', 'spaces-key');
        Config::set('filesystems.disks.spaces.secret', 'spaces-secret');
        Config::set('filesystems.disks.spaces.region', 'sfo3');
        Config::set('filesystems.disks.spaces.bucket', 'vod-media');
        Config::set('filesystems.disks.spaces.endpoint', 'https://sfo3.digitaloceanspaces.com');
        Config::set('filesystems.disks.spaces.root', 'uploads');
        Storage::forgetDisk('spaces');

        $diskConfiguration = Config::get('filesystems.disks.spaces');

        $this->assertSame('s3', $diskConfiguration['driver']);
        $this->assertSame('spaces-key', $diskConfiguration['key']);
        $this->assertSame('spaces-secret', $diskConfiguration['secret']);
        $this->assertSame('sfo3', $diskConfiguration['region']);
        $this->assertSame('vod-media', $diskConfiguration['bucket']);
        $this->assertSame('https://sfo3.digitaloceanspaces.com', $diskConfiguration['endpoint']);
        $this->assertSame('uploads', $diskConfiguration['root']);
        $this->assertFalse($diskConfiguration['use_path_style_endpoint']);
    }
}
