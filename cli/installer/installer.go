package installer

import (
	"fmt"
	"os"
	"path"

	"github.com/syncloud/golib/config"
	"github.com/syncloud/golib/linux"
	"github.com/syncloud/golib/platform"
	"go.uber.org/zap"
)

const (
	App      = "ntfy"
	UserName = "ntfy"
)

type Variables struct {
	App             string
	AppDir          string
	CommonDir       string
	DataDir         string
	StorageDir      string
	AuthLocalSocket string
	LogoutUrl       string
	Url             string
}

type Installer struct {
	appDir         string
	commonDir      string
	dataDir        string
	configDir      string
	platformClient *platform.Client
	logger         *zap.Logger
}

func New(logger *zap.Logger) *Installer {
	appDir := fmt.Sprintf("/snap/%s/current", App)
	commonDir := fmt.Sprintf("/var/snap/%s/common", App)
	dataDir := fmt.Sprintf("/var/snap/%s/current", App)
	return &Installer{
		appDir:         appDir,
		commonDir:      commonDir,
		dataDir:        dataDir,
		configDir:      path.Join(dataDir, "config"),
		platformClient: platform.New(),
		logger:         logger,
	}
}

func (i *Installer) Install() error {
	return i.UpdateConfigs()
}

func (i *Installer) Configure() error {
	return i.UpdateConfigs()
}

func (i *Installer) PostRefresh() error {
	return i.UpdateConfigs()
}

func (i *Installer) StorageChange() error {
	_, err := i.platformClient.InitStorage(App, UserName)
	if err != nil {
		return err
	}
	return i.UpdateConfigs()
}

func (i *Installer) AccessChange() error {
	return i.UpdateConfigs()
}

func (i *Installer) BackupPreStop() error {
	return nil
}

func (i *Installer) RestorePreStart() error {
	return nil
}

func (i *Installer) RestorePostStart() error {
	return i.UpdateConfigs()
}

func (i *Installer) UpdateConfigs() error {
	if err := linux.CreateUser(UserName); err != nil {
		return err
	}

	for _, dir := range []string{i.configDir, path.Join(i.dataDir, "nginx")} {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return err
		}
	}

	storageDir, err := i.platformClient.InitStorage(App, UserName)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(path.Join(storageDir, "attachments"), 0755); err != nil {
		return err
	}

	appUrl, err := i.platformClient.GetAppUrl(App)
	if err != nil {
		return err
	}

	authUrl, err := i.platformClient.GetAppUrl("auth")
	if err != nil {
		return err
	}

	variables := Variables{
		App:             App,
		AppDir:          i.appDir,
		CommonDir:       i.commonDir,
		DataDir:         i.dataDir,
		StorageDir:      storageDir,
		AuthLocalSocket: i.platformClient.GetAuthLocalSocket(),
		LogoutUrl:       fmt.Sprintf("%s/logout", authUrl),
		Url:             appUrl,
	}
	if err := config.Generate(path.Join(i.appDir, "config"), i.configDir, variables); err != nil {
		return err
	}

	if err := linux.Chown(i.dataDir, UserName); err != nil {
		return err
	}
	if err := linux.Chown(i.commonDir, UserName); err != nil {
		return err
	}
	return linux.Chown(storageDir, UserName)
}
