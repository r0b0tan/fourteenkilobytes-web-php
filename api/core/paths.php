<?php

declare(strict_types=1);

/**
 * Data file locations shared by the API, the public router and the feed.
 */
define('DATA_DIR', dirname(__DIR__, 2) . '/data');
define('INSTANCE_FILE', DATA_DIR . '/instance.json');
define('MANIFEST_FILE', DATA_DIR . '/manifest.json');
define('SETTINGS_FILE', DATA_DIR . '/settings.json');
define('PAGE_TYPES_FILE', DATA_DIR . '/page-types.json');
define('POSTS_DIR', DATA_DIR . '/posts');
define('SOURCES_DIR', DATA_DIR . '/sources');
