// Metro в монорепо: пакеты лежат выше папки приложения, и без этих двух
// настроек сборщик не найдёт @tpg/engine и будет ругаться на дубли react.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
// Один экземпляр зависимостей на всё дерево: иначе получаем два React.
config.resolver.disableHierarchicalLookup = true

module.exports = config
