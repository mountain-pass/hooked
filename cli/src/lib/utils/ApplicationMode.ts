
type ApplicationMode = 'development' | 'production' | 'test'

export default {
    getApplicationMode(): ApplicationMode {
        return process.env.NODE_ENV as ApplicationMode || 'development'
    }
}