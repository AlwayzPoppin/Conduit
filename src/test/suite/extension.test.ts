import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('NexGenSynapse.conduit'));
    });

    test('Extension should activate', async () => {
        const ext = vscode.extensions.getExtension('NexGenSynapse.conduit');
        await ext?.activate();
        assert.ok(ext?.isActive);
    });

    test('should register conduit.openPanel command', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('conduit.openPanel'));
    });
});
