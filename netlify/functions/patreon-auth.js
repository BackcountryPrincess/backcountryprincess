<?php
// public_html/maple.backcountryprincess.com/patreon/login.php

session_start();
require_once __DIR__ . '/config.php';

$state = bin2hex(random_bytes(16));
$_SESSION['patreon_state'] = $state;

$clientId = trim((string)PATREON_CLIENT_ID);
$redirect = trim((string)PATREON_REDIRECT_URI);

// FORCE www.patreon.com (do not use patreon.com)
$authorizeBase = 'https://www.patreon.com/oauth2/authorize';

$params = [
  'response_type' => 'code',
  'client_id'     => $clientId,
  'redirect_uri'  => $redirect,
  'scope'         => 'identity identity.memberships',
  'state'         => $state,
];

$query = http_build_query($params, '', '&', PHP_QUERY_RFC3986);
$url = $authorizeBase . '?' . $query;

// DEBUG: /patreon/login.php?debug=1
if (isset($_GET['debug']) && $_GET['debug'] === '1') {
  header('Content-Type: text/plain; charset=utf-8');
  echo "CLIENT_ID:\n{$clientId}\n\n";
  echo "REDIRECT_URI:\n{$redirect}\n\n";
  echo "AUTHORIZE_URL:\n{$url}\n";
  exit;
}

// HARD redirect with full headers (reduces host rewriting)
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Location: ' . $url, true, 302);
exit;
