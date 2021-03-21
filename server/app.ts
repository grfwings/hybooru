import * as http from 'http';
import express from 'express';
import csrf from 'csurf';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import reactMiddleware from "./middlewares/reactMiddleware";
import configMiddleware from "./middlewares/configMiddleware";
import HTTPError from "./helpers/HTTPError";
import { ErrorPageData } from "./routes/apiTypes";
import { router } from "./routes";
import "./helpers/db";

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(compression());
app.use('/static', express.static('static'));
if(process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
  app.use(require('./helpers/webpackHelper').mount());
} else {
  app.use('/client.js', express.static('client.js'));
  app.use('/style.css', express.static('style.css'));
}

app.use(configMiddleware);
app.use(reactMiddleware);
app.use(csrf({ cookie: true }));

app.use('/', router);

app.use((req, res, next) => {
  next(new HTTPError(404));
});

app.use((err: Partial<HTTPError>, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if((err as any).code === 'EBADCSRFTOKEN') err = new HTTPError(403, "Bad CSRF Token");
  
  const code = err.HTTPcode || 500;
  const error = {
    code,
    message: err.publicMessage || http.STATUS_CODES[code] || "Something Happened",
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  };
  res.status(code).react<ErrorPageData>({ _error: error });
});

export default app;
