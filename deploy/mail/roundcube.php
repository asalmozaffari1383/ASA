<?php
$config['des_key'] = trim(file_get_contents(__DIR__ . '/des-key'));
$config['product_name'] = 'ASA Mail';
$config['force_https'] = true;
$config['use_https'] = true;
$config['trusted_host_patterns'] = ['^inbox\\.asaeng\\.org$', '^mx1\\.asaeng\\.org$'];
$config['session_lifetime'] = 30;
$config['login_autocomplete'] = 0;
$config['imap_conn_options'] = ['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]];
$config['smtp_conn_options'] = ['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]];
