"""Push a Site source using a short-lived credential supplied over hidden stdin.
Credentials remain in process memory and child environment; never written to disk.
"""
import json, os, subprocess, sys, termios
fd = sys.stdin.fileno()
old = termios.tcgetattr(fd) if os.isatty(fd) else None
if old:
    hidden = termios.tcgetattr(fd)
    hidden[3] &= ~termios.ECHO
    termios.tcsetattr(fd, termios.TCSADRAIN, hidden)
try:
    print('Ready for source credential JSON on stdin (input is hidden).', flush=True)
    credential = json.loads(sys.stdin.readline())
finally:
    if old:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)
env = os.environ.copy()
if credential.get('auth_mode') != 'work_proxy':
    env['GIT_CONFIG_COUNT'] = '1'
    env['GIT_CONFIG_KEY_0'] = 'http.extraHeader'
    env['GIT_CONFIG_VALUE_0'] = 'Authorization: Bearer ' + credential['token']
subprocess.run(['git', 'push', credential['remote_url'], 'HEAD:refs/heads/' + credential['branch']], env=env, check=True)
print(json.dumps({'commit_sha':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'remote_url':credential['remote_url']}))
