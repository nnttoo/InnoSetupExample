// Haryanto 4 September 2026
// @ts-ignore
import innoSetupCompiler from "innosetup-compiler";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import pngToIco from "png-to-ico";

function getExeVersion(exePath: string): string {
    try {
        const command = `powershell -Command "(Get-Item '${exePath}').VersionInfo.FileVersion"`;
        const stdout = execSync(command, { encoding: "utf-8" });
        return stdout.trim() || "1.0.0";
    } catch (error) {
        console.warn("Failed to extract version from EXE, fallback to 1.0.0:", error);
        return "1.0.0";
    }
}

async function convertPngToIco(pngPath: string, icoPath: string): Promise<void> {
    console.log("Converting appIcon.png to appIcon.ico...");
    const buf = await pngToIco(pngPath);
    fs.writeFileSync(icoPath, buf);
    console.log("Icon converted successfully.");
}

async function buildInnoInstaller(): Promise<void> {
    const sourceDir = path.resolve(__dirname, "../dist");
    const asset = path.resolve(__dirname, "../assets");
    const outputDir = path.resolve(__dirname, "../dist-installer");
    const licensePath = path.resolve(asset,"license.txt");
    const targetExePath = path.join(sourceDir, "MineDispatch_Simulator.exe");
    const appVersion = getExeVersion(targetExePath);
    const pngIconPath = path.resolve(asset, "icon.png");
    const icoIconPath = path.resolve(asset, "appIcon.ico");
    
    await convertPngToIco(pngIconPath, icoIconPath);

    // Format Inno Setup Script (.iss)
    // Haryanto 4 September 2026
    const issScript = `
[Setup]
AppName=MineDispatch Simulator
AppVersion=${appVersion}
AppPublisher=MyCompany
DefaultDirName={autopf}\\MineDispatch Simulator
DefaultGroupName=MineDispatch Simulator
OutputDir=${outputDir}
OutputBaseFilename=MineDispatch_Simulator_Setup_${appVersion}
LicenseFile=${licensePath}
SetupIconFile=${icoIconPath}
Compression=lzma2/ultra64
SolidCompression=yes

; --- Windows Installed Apps Configuration (System-Wide Admin) ---
PrivilegesRequired=admin
Uninstallable=yes
CreateUninstallRegKey=yes
UninstallDisplayName=MineDispatch Simulator
UninstallDisplayIcon={app}\\appIcon.ico

[Files]
Source: "${sourceDir}\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "${icoIconPath}"; DestDir: "{app}"; DestName: "appIcon.ico"

[Icons]
Name: "{autodesktop}\\MineDispatch Simulator"; Filename: "{app}\\MineDispatch_Simulator.exe"; IconFilename: "{app}\\appIcon.ico"; IconIndex: 0; WorkingDir: "{app}"

[Run]
Filename: "{app}\\MineDispatch_Simulator.exe"; Description: "Launch MineDispatch Simulator"; Flags: postinstall nowait skipifsilent
`;

    const issFilePath = path.resolve(__dirname, "temp_config.iss");
    fs.writeFileSync(issFilePath, issScript);

    try {
        console.log("Compiling Inno Setup installer via TypeScript...");
        await innoSetupCompiler(issFilePath, { verbose: true });
        console.log("Installer generated successfully in dist-installer!");
    } catch (error) {
        console.error("Failed to build installer:", error);
    } finally {
        if (fs.existsSync(issFilePath)) {
            fs.unlinkSync(issFilePath); // Clean up temporary .iss file
        }
    }
}

buildInnoInstaller();