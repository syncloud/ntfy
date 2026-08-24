package installer

import (
	"fmt"
	"os"
	"os/exec"
	"path"
	"regexp"
)

// Regenerating the keypair invalidates every browser subscription, so it is generated once and
// kept in SNAP_DATA, which survives a refresh.
var webPushKeyRegexp = regexp.MustCompile(`(?m)^web-push-(public|private)-key:\s*(\S+)\s*$`)

type WebPushKeys struct {
	Public  string
	Private string
}

func (i *Installer) webPushKeys() (*WebPushKeys, error) {
	keysFile := path.Join(i.dataDir, "webpush.keys")
	content, err := os.ReadFile(keysFile)
	if err == nil {
		keys := parseWebPushKeys(string(content))
		if keys != nil {
			return keys, nil
		}
		i.logger.Info("regenerating unreadable web push keys")
	} else if !os.IsNotExist(err) {
		return nil, err
	}

	output, err := exec.Command(path.Join(i.appDir, "bin", "ntfy"), "webpush", "keys").CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("cannot generate web push keys: %w: %s", err, string(output))
	}
	keys := parseWebPushKeys(string(output))
	if keys == nil {
		return nil, fmt.Errorf("cannot parse web push keys from: %s", string(output))
	}
	if err := os.WriteFile(keysFile, output, 0600); err != nil {
		return nil, err
	}
	return keys, nil
}

func parseWebPushKeys(output string) *WebPushKeys {
	keys := &WebPushKeys{}
	for _, match := range webPushKeyRegexp.FindAllStringSubmatch(output, -1) {
		if match[1] == "public" {
			keys.Public = match[2]
		} else {
			keys.Private = match[2]
		}
	}
	if keys.Public == "" || keys.Private == "" {
		return nil
	}
	return keys
}
