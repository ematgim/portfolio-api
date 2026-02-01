import mongoose from 'mongoose';

export class MongoConnection {
  private static instance: MongoConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): MongoConnection {
    if (!MongoConnection.instance) {
      MongoConnection.instance = new MongoConnection();
    }
    return MongoConnection.instance;
  }

  public async connect(uri?: string): Promise<void> {
    if (this.isConnected) {
      console.log('MongoDB ya está conectado');
      return;
    }

    try {
      const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio-chat';
      
      await mongoose.connect(mongoUri);
      
      this.isConnected = true;
      console.log('✅ MongoDB conectado exitosamente');
      
      mongoose.connection.on('error', (error) => {
        console.error('❌ Error de MongoDB:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB desconectado');
        this.isConnected = false;
      });

    } catch (error) {
      console.error('❌ Error al conectar con MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('MongoDB desconectado');
    } catch (error) {
      console.error('Error al desconectar MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const mongoConnection = MongoConnection.getInstance();
