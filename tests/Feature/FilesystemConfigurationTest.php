<?php

namespace Tests\Feature;

use Tests\TestCase;

class FilesystemConfigurationTest extends TestCase
{
    public function test_digitalocean_spaces_disk_uses_the_s3_driver_and_spaces_credentials(): void
    {
        config([
            'filesystems.disks.spaces.key' => 'spaces-key',
            'filesystems.disks.spaces.secret' => 'spaces-secret',
            'filesystems.disks.spaces.region' => 'nyc3',
            'filesystems.disks.spaces.bucket' => 'media-bucket',
            'filesystems.disks.spaces.endpoint' => 'https://nyc3.digitaloceanspaces.com',
        ]);

        $disk = config('filesystems.disks.spaces');

        $this->assertSame('s3', $disk['driver']);
        $this->assertSame('spaces-key', $disk['key']);
        $this->assertSame('spaces-secret', $disk['secret']);
        $this->assertSame('nyc3', $disk['region']);
        $this->assertSame('media-bucket', $disk['bucket']);
        $this->assertSame('https://nyc3.digitaloceanspaces.com', $disk['endpoint']);
        $this->assertFalse($disk['use_path_style_endpoint']);
    }
}
