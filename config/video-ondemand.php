<?php

// This file is named video-ondemand.php to keep the public configuration
// namespace distinct. Keep env() calls inside config files for config caching.

return [
    /*
    |--------------------------------------------------------------------------
    | Database
    |--------------------------------------------------------------------------
    |
    | The table prefix is applied to each package table. Set an individual
    | table name to override the generated name.
    |
    */
    'database' => [
        'table_prefix' => env('VIDEO_ON_DEMAND_TABLE_PREFIX', 'vod_'),

        'tables' => [
            'videos' => env('VIDEO_ON_DEMAND_TABLE_VIDEOS', 'vod_videos'),
            'uploads' => env('VIDEO_ON_DEMAND_TABLE_UPLOADS', 'vod_uploads'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Storage
    |--------------------------------------------------------------------------
    |
    | The disk must be defined in the host application's filesystems config.
    | For S3, configure the Laravel S3 disk with the AWS_* environment keys.
    |
    */
    'storage' => [
        'disk' => env('VIDEO_ON_DEMAND_STORAGE_DISK', env('FILESYSTEM_DISK', 's3')),
        'directory' => env('VIDEO_ON_DEMAND_STORAGE_DIRECTORY', 'videos'),
        'orphan_cleanup_min_age_minutes' => (int) env('VIDEO_ON_DEMAND_ORPHAN_CLEANUP_MIN_AGE_MINUTES', 30),
    ],

    /*
    |--------------------------------------------------------------------------
    | Uploads
    |--------------------------------------------------------------------------
    */
    'uploads' => [
        'max_size_kilobytes' => (int) env('VIDEO_ON_DEMAND_UPLOAD_MAX_SIZE_KB', 512000),
        'part_size_megabytes' => (int) env('VIDEO_ON_DEMAND_UPLOAD_PART_SIZE_MB', 64),
        'session_lifetime_minutes' => (int) env('VIDEO_ON_DEMAND_UPLOAD_SESSION_LIFETIME_MINUTES', 1440),
        'part_url_lifetime_minutes' => (int) env('VIDEO_ON_DEMAND_UPLOAD_PART_URL_LIFETIME_MINUTES', 15),
        'allowed_mime_types' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('VIDEO_ON_DEMAND_UPLOAD_ALLOWED_MIME_TYPES', 'video/mp4,video/quicktime,video/x-matroska,video/webm'))
        ))),
    ],

    'videos' => [
        'deletion_pending_status' => 'delete_pending',
    ],
];
