import { getRequestDb } from '@/db/requests';
import { directions, isContactValid } from '@/lib/request-validation';
const failure = (error:string,status=400) => Response.json({error},{status});
export async function POST(request:Request) {
  const origin = request.headers.get('origin');
  if(origin && origin !== new URL(request.url).origin) return failure('Источник заявки не подтверждён.',403);
  if(!request.headers.get('content-type')?.includes('application/json')) return failure('Неверный формат заявки.',415);
  const body = await request.text();
  if(body.length>8192) return failure('Заявка слишком большая.',413);
  let input;
  try {input=JSON.parse(body);} catch {return failure('Неверный формат заявки.');}
  if(!input || typeof input !== 'object') return failure('Заполните заявку.');
  const {id,name,contact,direction,message,consent,website} = input;
  if(website) return failure('Не удалось проверить заявку.');
  if(typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return failure('Обновите страницу и попробуйте снова.');
  if(typeof name !== 'string' || name.trim().length<2 || name.length>80) return failure('Укажите имя: от 2 до 80 символов.');
  if(typeof contact !== 'string' || contact.length>60 || !isContactValid(contact.trim())) return failure('Проверьте телефон или Telegram.');
  if(!directions.includes(direction)) return failure('Выберите направление занятий.');
  if(typeof message !== 'string' || message.length>1000) return failure('Описание должно быть не длиннее 1 000 символов.');
  if(consent !== true) return failure('Необходимо согласие на использование контактов.');
  try {
    await getRequestDb().prepare('INSERT INTO requests (id,name,contact,direction,message,consent,created_at) VALUES (?,?,?,?,?,1,?) ON CONFLICT(id) DO NOTHING').bind(id,name.trim(),contact.trim(),direction,message.trim(),new Date().toISOString()).run();
    return Response.json({ok:true,reference:id.slice(0,8).toUpperCase()},{status:201,headers:{'Cache-Control':'no-store'}});
  } catch {return failure('Не удалось сохранить заявку. Попробуйте ещё раз через минуту.',503);}
}
