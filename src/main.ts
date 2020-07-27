import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import * as rateLimit from 'express-rate-limit';
import helmet from 'helmet';

dotenv.config();

import { AppModule } from './app.module';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // app.use(helmet());

  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message:
      "Too many requests from this IP, please try again later"
  }));

  const createAccountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 3, // start blocking after 3 requests
    message:
      "Too many accounts created from this IP, please try again after an hour"
  });

  // app.use("/register", createAccountLimiter);
  await app.listen(4000);
  console.log(`Application is running on: ${await app.getUrl()}`);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
