#ifndef MyAppVersion
  #define MyAppVersion "1.5.4"
#endif

#define MyAppName "WeekBox"
#define MyAppPublisher "Crew Awesome"
#define MyAppURL "https://github.com/Crew-Awesome/Weekbox"
#define MyAppExeName "WeekBox-win_x64.exe"
; TODO: replace with the real WeekBox Discord invite before shipping.
#define MyDiscordURL "https://discord.gg/xQTtYF2Cfn"

[Setup]
; !!! DO NOT TOUCH THIS AppId. EVER. UNDER ANY CIRCUMSTANCES. !!!
; Changing it breaks every future upgrade and leaves orphaned uninstall
; entries. This value is permanent for the life of the product.
AppId={{5F9E2294-C1EE-465A-9411-D1BE0E32D48F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/issues
AppUpdatesURL={#MyAppURL}/releases
DefaultDirName={%LOCALAPPDATA}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=..\dist\installer
OutputBaseFilename=WeekBox-{#MyAppVersion}-windows-x64-setup
SetupIconFile=..\app\assets\icons\launcher-icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern dark
; DO NOT TOUCH: these files must exist at these exact paths or the compile
; fails. Regenerate them in the installer folder, do not repoint elsewhere.
WizardSmallImageFile=..\app\assets\icons\launcher-icon.png
WizardImageFile=..\installer\mod-manager-panel.png
SetupArchitecture=x64
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "..\dist\WeekBox\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\WeekBox\resources.neu"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\WeekBox\extensions\*"; DestDir: "{app}\extensions"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
; DO NOT TOUCH: filename must match the ExtractTemporaryFile call in [Code]
; below, or the Discord page crashes at runtime.
Source: "..\installer\weekbox-banner.bmp"; Flags: dontcopy

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
var
  DiscordPage: TWizardPage;

procedure JoinDiscordClick(Sender: TObject);
var
  ErrorCode: Integer;
begin
  ShellExec('open', '{#MyDiscordURL}', '', '', SW_SHOWNORMAL, ewNoWait, ErrorCode);
end;

procedure InitializeWizard;
var
  BannerImage: TBitmapImage;
  Heading: TNewStaticText;
  Blurb: TNewStaticText;
  JoinButton: TNewButton;
  BannerPath: String;
  TopY: Integer;
begin
  DiscordPage := CreateCustomPage(wpInstalling,
    'Join the WeekBox community',
    'Get help, share mods, and hear about updates first.');

  TopY := 0;
  try
    ExtractTemporaryFile('weekbox-banner.bmp');
    BannerPath := ExpandConstant('{tmp}\weekbox-banner.bmp');
    BannerImage := TBitmapImage.Create(DiscordPage);
    BannerImage.Parent := DiscordPage.Surface;
    BannerImage.Left := 0;
    BannerImage.Top := 0;
    BannerImage.Width := DiscordPage.SurfaceWidth;
    BannerImage.Height := ScaleY(90);
    BannerImage.Bitmap.Width := BannerImage.Width;
    BannerImage.Bitmap.Height := BannerImage.Height;
    BannerImage.Bitmap.LoadFromFile(BannerPath);
    TopY := BannerImage.Top + BannerImage.Height + ScaleY(16);
  except
  end;

  Heading := TNewStaticText.Create(DiscordPage);
  Heading.Parent := DiscordPage.Surface;
  Heading.Top := TopY;
  Heading.Left := 0;
  Heading.Width := DiscordPage.SurfaceWidth;
  Heading.AutoSize := False;
  Heading.Height := ScaleY(24);
  Heading.Font.Size := 12;
  Heading.Font.Style := [fsBold];
  Heading.Caption := 'Thanks for installing WeekBox!';

  Blurb := TNewStaticText.Create(DiscordPage);
  Blurb.Parent := DiscordPage.Surface;
  Blurb.Top := Heading.Top + Heading.Height + ScaleY(6);
  Blurb.Left := 0;
  Blurb.Width := DiscordPage.SurfaceWidth;
  Blurb.AutoSize := False;
  Blurb.Height := ScaleY(48);
  Blurb.WordWrap := True;
  Blurb.Caption := 'Join our Discord server to get support, request features, ' +
    'find new mods, and be the first to know when a new version drops.';

  JoinButton := TNewButton.Create(DiscordPage);
  JoinButton.Parent := DiscordPage.Surface;
  JoinButton.Top := DiscordPage.SurfaceHeight - ScaleY(34) - ScaleY(8);
  JoinButton.Left := 0;
  JoinButton.Width := ScaleX(120);
  JoinButton.Height := ScaleY(34);
  JoinButton.Caption := 'Join';
  JoinButton.OnClick := @JoinDiscordClick;
end;
