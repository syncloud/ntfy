package installer

import (
	"testing"
)

const generated = `Web Push keys generated. Add the following lines to your config file:

web-push-public-key: BHs06EJi7vBgx7fJKakk6cUPzPrFYyje8hELU8p6oz_qhEI9r2Bgz8ZHss-u9F2tBfBChcNNkExNz2YZsOeNrcU
web-push-private-key: bXjxnZKBU2OIfo0KNbXDOdiZwzrkJXFEXgHlHaun29E
web-push-file: /var/cache/ntfy/webpush.db # or similar
web-push-email-address: <email address>

See https://ntfy.sh/docs/config/#web-push for details.
`

func TestParseWebPushKeys(t *testing.T) {
	keys := parseWebPushKeys(generated)
	if keys == nil {
		t.Fatal("expected keys")
	}
	if keys.Public != "BHs06EJi7vBgx7fJKakk6cUPzPrFYyje8hELU8p6oz_qhEI9r2Bgz8ZHss-u9F2tBfBChcNNkExNz2YZsOeNrcU" {
		t.Errorf("public key: %s", keys.Public)
	}
	if keys.Private != "bXjxnZKBU2OIfo0KNbXDOdiZwzrkJXFEXgHlHaun29E" {
		t.Errorf("private key: %s", keys.Private)
	}
}

func TestParseWebPushKeysIncomplete(t *testing.T) {
	if parseWebPushKeys("web-push-public-key: only-public") != nil {
		t.Error("expected nil when the private key is missing")
	}
	if parseWebPushKeys("") != nil {
		t.Error("expected nil for empty output")
	}
}
