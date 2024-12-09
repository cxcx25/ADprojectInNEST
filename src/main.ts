import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
    logger.log('Starting application...');
    
    const app = await NestFactory.create(AppModule);
    
    // Enable CORS for frontend
    app.enableCors({
      origin: true, // Allow all origins in development
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
    logger.log('CORS enabled for http://localhost:4200, http://localhost:4201 and http://localhost:4202');
    
    // Add global prefix for all routes
    app.setGlobalPrefix('api');
    logger.log('Global prefix /api added');
    
    await app.listen(3001);
    logger.log('Application started successfully on http://localhost:3001');
    logger.log('Press CTRL+C to stop the application');
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();