import os
import pytest
import requests
from os.path import dirname, join
from subprocess import check_output
from syncloudlib.integration.hosts import add_host_alias
from syncloudlib.integration.installer import local_install, wait_for_installer

DIR = dirname(__file__)
TMP_DIR = '/tmp/syncloud'
UP_TOPIC = 'upAbCdEf123456'
UP_TOPIC_SHORT = 'upShort12'


@pytest.fixture(scope="session")
def module_setup(request, device, data_dir, platform_data_dir, app_dir, artifact_dir, snap_data_dir):
    def module_teardown():
        platform_log_dir = join(artifact_dir, 'platform_log')
        os.mkdir(platform_log_dir)
        device.scp_from_device('{0}/log/*'.format(platform_data_dir), platform_log_dir)

        device.run_ssh('mkdir {0}'.format(TMP_DIR), throw=False)
        device.run_ssh('journalctl > {0}/journalctl.log'.format(TMP_DIR), throw=False)
        device.run_ssh('ps auxfw > {0}/ps.log'.format(TMP_DIR), throw=False)
        device.run_ssh('ls -la {0}/ > {1}/app.ls.log'.format(app_dir, TMP_DIR), throw=False)
        device.run_ssh('ls -la {0}/ > {1}/snap.data.ls.log'.format(snap_data_dir, TMP_DIR), throw=False)

        app_log_dir = join(artifact_dir, 'log')
        os.mkdir(app_log_dir)
        device.scp_from_device('{0}/*'.format(TMP_DIR), app_log_dir)
        device.scp_from_device('{0}/config/*'.format(snap_data_dir), artifact_dir, throw=False)
        check_output('chmod -R a+r {0}'.format(artifact_dir), shell=True)

    request.addfinalizer(module_teardown)


def test_start(module_setup, device, app, domain, device_host):
    add_host_alias(app, device_host, domain)
    device.run_ssh('date', retries=100, throw=True)
    device.run_ssh('mkdir {0}'.format(TMP_DIR))


def test_activate_device(device):
    response = device.activate_custom()
    assert response.status_code == 200, response.text


def test_install(app_archive_path, device_host, device_session, device_password, domain):
    local_install(device_host, device_password, app_archive_path)
    wait_for_installer(device_session, domain)


def test_index_redirects_browser_to_login(app_domain, domain):
    response = requests.get('https://{0}'.format(app_domain), verify=False, allow_redirects=False)
    assert response.status_code == 302, response.text
    assert 'auth.{0}'.format(domain) in response.headers.get('Location', ''), response.headers


def test_index_challenges_client_that_sent_credentials(app_domain):
    response = requests.get('https://{0}'.format(app_domain), verify=False, allow_redirects=False,
                            auth=('nobody', 'wrong'))
    assert response.status_code == 401, response.text
    assert response.headers.get('WWW-Authenticate', '').startswith('Basic '), response.headers


def test_index_with_device_credentials(app_domain, device_user, device_password):
    response = requests.get('https://{0}'.format(app_domain), verify=False,
                            auth=(device_user, device_password))
    assert response.status_code == 200, response.text


def test_user_auto_provisioned_as_admin(app_domain, device_user, device_password):
    response = requests.get('https://{0}/v1/account'.format(app_domain), verify=False,
                            auth=(device_user, device_password))
    assert response.status_code == 200, response.text
    account = response.json()
    assert account['username'] == device_user, response.text
    assert account['role'] == 'admin', response.text


def test_publish_and_poll_authenticated(app_domain, device_user, device_password):
    response = requests.post('https://{0}/mytopic'.format(app_domain), data='hello',
                             verify=False, auth=(device_user, device_password))
    assert response.status_code == 200, response.text

    response = requests.get('https://{0}/mytopic/json?poll=1'.format(app_domain),
                            verify=False, auth=(device_user, device_password))
    assert response.status_code == 200, response.text
    assert 'hello' in response.text, response.text


def test_anonymous_topic_denied(app_domain):
    response = requests.get('https://{0}/mytopic/json?poll=1'.format(app_domain),
                            verify=False, allow_redirects=False, auth=('nobody', 'wrong'))
    assert response.status_code == 401, response.text


def test_unifiedpush_publish_is_anonymous(app_domain):
    response = requests.post('https://{0}/{1}?up=1'.format(app_domain, UP_TOPIC),
                             data='unifiedpush', verify=False)
    assert response.status_code == 200, response.text


def test_unifiedpush_topic_cannot_be_read_anonymously(app_domain):
    response = requests.get('https://{0}/{1}/json?poll=1'.format(app_domain, UP_TOPIC),
                            verify=False, allow_redirects=False, auth=('nobody', 'wrong'))
    assert response.status_code == 401, response.text


def test_unifiedpush_topic_readable_by_device_user(app_domain, device_user, device_password):
    response = requests.get('https://{0}/{1}/json?poll=1'.format(app_domain, UP_TOPIC),
                            verify=False, auth=(device_user, device_password))
    assert response.status_code == 200, response.text
    assert 'unifiedpush' in response.text, response.text


def test_unifiedpush_header_cannot_be_spoofed(app_domain):
    response = requests.post('https://{0}/{1}'.format(app_domain, UP_TOPIC), data='spoof',
                             verify=False, headers={'Remote-User': 'attacker',
                                                    'Remote-Groups': 'syncloud'})
    assert response.status_code == 200, response.text

    response = requests.get('https://{0}/v1/account'.format(app_domain), verify=False,
                            allow_redirects=False, auth=('nobody', 'wrong'),
                            headers={'Remote-User': 'attacker', 'Remote-Groups': 'syncloud'})
    assert response.status_code == 401, response.text


def test_unifiedpush_publish_any_topic_length(app_domain):
    response = requests.post('https://{0}/{1}'.format(app_domain, UP_TOPIC_SHORT),
                             data='unifiedpush', verify=False)
    assert response.status_code == 200, response.text


def test_matrix_gateway_discovery(app_domain):
    response = requests.get('https://{0}/_matrix/push/v1/notify'.format(app_domain), verify=False)
    assert response.status_code == 200, response.text
    assert response.json() == {'unifiedpush': {'gateway': 'matrix'}}, response.text


def test_storage_change_event(device):
    device.run_ssh('snap run ntfy.storage-change > {0}/storage-change.log'.format(TMP_DIR))


def test_remove(device, app):
    response = device.app_remove(app)
    assert response.status_code == 200, response.text


def test_reinstall(app_archive_path, device_host, device_password):
    local_install(device_host, device_password, app_archive_path)
