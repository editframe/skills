import type { CSSProperties } from "react";
import { Solo, type Aspect } from "../src/primitives";

export const duration = 12.5;
export const posterTime = 5.8;
export const aspect = "landscape" as const;
const white = "#f3f2ed",
  blue = "#83d7ef",
  gold = "#f6d77e";
const p = (t: number) => `${(t / duration) * 100}%`;
const animation = (name: string): CSSProperties => ({
  animation: `manim-${name} ${duration}s linear both`,
});

// GLYPHS_START
const glyphs: Record<string, { d: string; width: number }> = {
  " ": {
    d: "",
    width: 250.0,
  },
  ".": {
    d: "M181 43C181 73 155 100 126 100C95 100 70 75 70 44C70 13 94 -11 125 -11C155 -11 181 14 181 43Z",
    width: 250.0,
  },
  "1": {
    d: "M394 0V15C319 15 299 33 299 76V673L290 676L111 585V571L138 581C156 588 173 593 183 593C204 593 213 578 213 544V95C213 40 192 19 118 15V0Z",
    width: 500.0,
  },
  "2": {
    d: "M474 137 460 143C427 87 406 76 364 76H130L295 252C384 346 423 421 423 500C423 599 351 676 238 676C115 676 51 594 30 477L51 472C91 570 126 602 198 602C283 602 337 552 337 461C337 376 301 300 207 201L29 12V0H420Z",
    width: 500.0,
  },
  "4": {
    d: "M473 167V231H370V676H326L12 231V167H292V0H370V167ZM292 231H52L292 574Z",
    width: 500.0,
  },
  "6": {
    d: "M446 684C308 669 229 645 143 555C72 482 34 387 34 279C34 209 53 138 81 87C116 23 179 -14 258 -14C324 -14 380 13 417 59C450 99 468 155 468 219C468 348 396 428 279 428C235 428 201 421 152 383C179 534 291 642 448 668ZM378 188C378 86 341 14 269 14C175 14 127 114 127 266C127 358 186 382 243 382C336 382 378 316 378 188Z",
    width: 500.0,
  },
  "8": {
    d: "M445 155C445 235 413 289 290 371C389 424 424 458 424 533C424 611 355 676 256 676C145 676 62 616 62 520C62 455 83 417 186 332C79 257 56 218 56 149C56 55 135 -14 248 -14C368 -14 445 52 445 155ZM355 533C355 471 329 429 261 389C173 441 136 487 136 549C136 611 179 648 246 648C314 648 355 602 355 533ZM271 272C339 226 369 186 369 124C369 59 324 14 259 14C183 14 132 66 132 158C132 223 153 264 212 312Z",
    width: 500.0,
  },
  "=": {
    d: "M637 320V386H48V320ZM637 120V186H48V120Z",
    width: 685.0,
  },
  K: {
    d: "M723 0V19C677 19 650 37 567 128L333 384L519 562C588 628 607 638 675 643V662H416V643L441 642C474 641 482 631 482 611C482 586 452 557 404 512L226 348V548C226 625 233 637 316 643V662H34V643C113 638 124 623 124 549V125C124 38 112 23 33 19V0H315V19C242 25 226 34 226 111V296L252 317L352 214C431 132 489 71 489 44C489 30 476 21 447 20L420 19V0Z",
    width: 722.0,
  },
  a: {
    d: "M442 66C425 52 415 47 399 47C381 47 368 67 368 113V304C368 365 364 386 340 415C316 444 278 460 222 460C177 460 135 448 107 430C72 408 56 376 56 350C56 323 78 304 99 304C125 304 145 326 145 345C145 366 139 369 139 387C139 414 169 436 209 436C254 436 287 408 287 346V292C174 250 137 231 107 211C68 185 37 146 37 94C37 28 80 -10 142 -10C185 -10 234 3 287 63H288C293 10 315 -10 352 -10C386 -10 412 0 442 38ZM287 127C287 98 281 84 252 64C235 53 214 48 194 48C155 48 125 72 125 125C125 156 135 180 159 202C184 225 225 246 287 268Z",
    width: 444.0,
  },
  b: {
    d: "M153 681 148 683C106 668 80 662 33 648L3 639V622C8 623 13 624 20 624C61 624 69 616 69 566V56C69 22 153 -10 234 -10C366 -10 468 92 468 240C468 364 395 460 288 460C227 460 174 427 153 376ZM153 318C153 360 199 397 252 397C288 397 320 380 341 350C366 315 380 257 380 197C380 139 367 95 343 65C321 37 289 22 250 22C198 22 153 42 153 74Z",
    width: 500.0,
  },
  c: {
    d: "M398 156C350 86 314 62 257 62C165 62 102 142 102 257C102 361 157 431 238 431C274 431 287 420 297 383L303 361C311 332 329 315 351 315C377 315 398 334 398 357C398 413 328 460 244 460C197 460 149 442 109 409C55 364 25 295 25 212C25 83 104 -10 215 -10C258 -10 296 4 330 32C360 56 380 85 412 147Z",
    width: 444.0,
  },
  d: {
    d: "M491 42V58C474 57 473 57 468 57C432 57 424 68 424 114V681L419 683C371 666 336 656 272 639V623C280 624 286 624 294 624C331 624 340 614 340 573V417C302 449 275 460 235 460C120 460 27 347 27 205C27 77 101 -10 212 -10C268 -10 306 10 340 57V-7L344 -10ZM340 102C340 95 334 84 325 74C307 53 282 42 251 42C167 42 113 122 113 245C113 358 162 432 238 432C292 432 340 385 340 332Z",
    width: 500.0,
  },
  e: {
    d: "M408 164C359 90 321 59 254 59C208 59 171 77 143 114C107 162 102 201 97 277H405C401 331 391 363 371 391C339 436 294 460 232 460C106 460 25 358 25 217C25 79 97 -10 215 -10C315 -10 385 48 424 157ZM99 309C110 384 149 424 205 424C271 424 292 390 303 309Z",
    width: 444.0,
  },
  f: {
    d: "M21 450V418H103V104C103 31 92 19 20 15V0H280V15C198 18 187 29 187 104V418H309V450H187V566C187 625 205 655 243 655C265 655 278 645 296 616C312 589 324 580 341 580C365 580 383 598 383 621C383 657 339 683 279 683C216 683 164 656 138 611C112 566 104 530 103 450Z",
    width: 333.0,
  },
  g: {
    d: "M470 388V427H393C373 427 358 430 338 437L316 445C289 455 262 460 236 460C143 460 69 388 69 297C69 234 95 196 162 163C148 149 134 136 119 123C86 94 73 74 73 54C73 32 84 21 126 1C54 -51 28 -84 28 -121C28 -174 105 -218 201 -218C273 -218 349 -194 401 -154C442 -122 461 -89 461 -49C461 13 414 55 340 58L211 64C157 67 133 75 133 91C133 111 166 146 193 154L212 152C230 150 244 149 250 149C285 149 322 164 354 188C390 215 406 252 406 304C406 333 401 356 387 388ZM152 338C152 397 180 432 226 432C257 432 283 415 299 385C318 350 329 305 329 264C329 209 300 174 255 174C193 174 152 239 152 335ZM433 -64C433 -122 357 -161 243 -161C155 -161 98 -132 98 -88C98 -65 107 -50 147 -2C181 -9 260 -15 309 -15C400 -15 433 -27 433 -64Z",
    width: 500.0,
  },
  h: {
    d: "M487 0V15C433 25 427 33 427 102V301C427 406 386 460 304 460C245 460 203 436 157 376V680L152 683C117 671 94 664 37 647L10 639V623C13 624 18 624 22 624C65 624 73 616 73 573V102C73 32 67 23 9 15V0H225V15C167 21 157 33 157 102V343C199 389 229 406 269 406C318 406 343 370 343 300V102C343 33 333 21 275 15V0Z",
    width: 500.0,
  },
  i: {
    d: "M180 632C180 660 158 683 129 683C101 683 78 660 78 632C78 603 100 581 128 581C158 581 180 603 180 632ZM253 0V15C187 20 179 31 179 105V456L175 460L20 405V389C38 394 53 394 62 394C87 394 95 378 95 331V104C95 28 85 19 16 15V0Z",
    width: 278.0,
  },
  l: {
    d: "M257 0V15C193 19 182 32 182 87V679L177 683C125 666 88 656 19 639V623C35 625 48 625 56 625C88 625 98 609 98 561V92C98 37 84 20 21 15V0Z",
    width: 278.0,
  },
  m: {
    d: "M775 0V15L749 17C719 19 706 32 706 77V280C706 398 671 460 590 460C532 460 481 434 427 376C409 433 375 460 321 460C276 460 234 451 168 383H166V457L158 460C107 441 74 430 19 415V398C32 401 40 402 51 402C77 402 86 385 86 336V88C86 30 72 16 16 15V0H238V15C185 17 170 27 170 70V348C170 350 176 357 183 365C203 389 252 408 289 408C332 408 354 366 354 297V86C354 25 343 19 286 15V0H510V15C453 16 438 30 438 95V347C468 390 498 408 545 408C602 408 622 375 622 296V90C622 32 613 21 557 15V0Z",
    width: 778.0,
  },
  n: {
    d: "M485 0V15C436 20 424 31 424 85V306C424 405 382 460 306 460C260 460 214 438 162 379H161V457L153 460C104 442 71 431 16 415V398C23 401 34 402 45 402C73 402 80 386 80 337V94C80 35 69 19 18 15V0H229V15C178 19 164 33 164 72V348C210 393 234 405 267 405C316 405 340 375 340 304V105C340 39 328 19 278 15L277 0Z",
    width: 500.0,
  },
  o: {
    d: "M470 231C470 369 376 460 254 460C119 460 29 367 29 228C29 89 124 -10 245 -10C380 -10 470 92 470 231ZM380 204C380 88 336 18 262 18C226 18 194 36 172 68C135 122 119 194 119 273C119 373 166 432 235 432C278 432 306 412 330 382C362 341 380 272 380 204Z",
    width: 500.0,
  },
  p: {
    d: "M159 458 153 460C100 439 64 426 9 409V393C18 394 25 394 34 394C68 394 75 384 75 337V-131C75 -183 64 -194 5 -200V-217H247V-199C172 -198 159 -187 159 -124V33C195 0 218 -10 260 -10C379 -10 470 102 470 247C470 371 400 460 303 460C247 460 203 436 159 381ZM159 334C159 364 215 400 261 400C335 400 384 324 384 207C384 97 335 22 263 22C216 22 159 58 159 88Z",
    width: 500.0,
  },
  r: {
    d: "M160 458 155 460C102 439 66 425 7 406V390C21 393 30 394 42 394C67 394 76 378 76 334V84C76 34 69 27 5 15V0H245V15C177 18 160 33 160 90V315C160 347 202 397 230 397C236 397 245 392 256 382C272 367 283 362 296 362C320 362 335 379 335 407C335 440 314 460 280 460C238 460 210 438 160 366Z",
    width: 333.0,
  },
  s: {
    d: "M156 301C128 318 113 347 113 369C113 416 145 437 188 437C248 437 278 404 301 314H316L311 450H300C292 441 288 440 284 440C277 440 267 443 256 448C235 458 213 459 189 459C107 459 51 415 51 336C51 285 88 237 171 191L225 161C258 143 278 117 278 86C278 45 246 12 195 12C126 12 89 56 68 153H52V-4H65C71 6 77 8 89 8C100 8 111 7 135 -1C158 -9 187 -10 208 -10C284 -10 348 48 348 115C348 172 324 199 260 238Z",
    width: 389.0,
  },
  t: {
    d: "M266 77C244 51 228 42 206 42C169 42 154 68 154 132V418H255V450H154V566C154 576 152 579 147 579C141 569 133 560 127 551C89 496 56 459 30 444C19 437 13 431 13 425C13 422 14 420 17 418H70V117C70 33 100 -10 158 -10C208 -10 246 14 279 66Z",
    width: 278.0,
  },
  u: {
    d: "M480 50H474C428 50 417 61 417 107V450H259V433C319 429 333 421 333 368V137C333 102 326 93 310 79C285 57 255 48 226 48C187 48 155 81 155 127V450H9V436C57 433 71 419 71 369V118C71 41 116 -10 193 -10C230 -10 287 9 336 76H338V-6L343 -9C393 11 429 22 480 36Z",
    width: 500.0,
  },
  v: {
    d: "M477 450H338V435C370 432 385 422 385 403C385 393 383 383 379 373L280 114L178 370C172 385 169 398 169 408C169 425 181 432 215 435V450H19V435C57 433 67 423 110 320L230 33C234 24 235 17 238 12C245 -6 250 -14 256 -14C262 -14 269 -1 284 36L412 357C439 424 447 432 477 435Z",
    width: 500.0,
  },
  x: {
    d: "M243 355C229 423 217 441 192 441C169 441 136 434 75 412L64 408L67 392L85 397C104 402 116 404 124 404C149 404 156 396 170 336L198 212L116 96C95 66 76 47 65 47C59 47 49 50 39 56C26 63 16 67 7 67C-13 67 -27 51 -27 31C-27 5 -8 -11 23 -11C54 -11 74 -2 118 57L206 176L235 57C247 7 262 -11 294 -11C332 -11 358 13 416 103L401 112C393 102 389 96 380 84C357 54 346 44 333 44C319 44 310 57 303 85L271 219C265 243 263 257 263 264C307 341 343 385 361 385C385 385 394 368 413 368C433 368 447 383 447 404C447 426 430 441 406 441C362 441 325 405 255 298Z",
    width: 444.0,
  },
  y: {
    d: "M475 450H342V435C373 435 388 427 388 411C388 407 387 400 384 393L287 117L175 367C169 381 162 397 162 408C162 426 176 433 219 435V450H14V436C40 432 57 423 67 401L199 119C218 79 241 33 241 18C241 2 221 -61 201 -90C185 -114 165 -134 151 -134C145 -134 136 -133 125 -127C107 -117 91 -114 73 -114C49 -114 30 -135 30 -160C30 -193 57 -218 100 -218C176 -218 223 -167 275 -25L425 384C439 421 451 432 475 435Z",
    width: 500.0,
  },
};
// GLYPHS_END

function WrittenText({
  text,
  size,
  start,
  stagger = 0.035,
  color = white,
  name,
}: {
  text: string;
  size: number;
  start: number;
  stagger?: number;
  color?: string;
  name: string;
}) {
  let cursor = 0;
  const width = [...text].reduce((sum, letter) => sum + (glyphs[letter].width * size) / 1000, 0);
  return (
    <g data-manim-written={name} aria-label={text} transform={`translate(${-width / 2} 0)`}>
      {[...text].map((letter, i) => {
        const glyph = glyphs[letter],
          x = cursor;
        cursor += (glyph.width * size) / 1000;
        const begin = start + i * stagger;
        return (
          <g key={i} transform={`translate(${x} 0) scale(${size / 1000} ${-size / 1000})`}>
            <path
              d={glyph.d}
              pathLength={1}
              fill={color}
              stroke={color}
              strokeWidth={(1000 / size) * 0.8}
              strokeLinejoin="round"
              strokeDasharray="1 1"
              style={animation(`${name}-${i}`)}
            />
            <style>{`@keyframes manim-${name}-${i}{0%,${p(begin)}{stroke-dashoffset:1;fill-opacity:0;stroke-opacity:0}${p(begin + 0.01)}{stroke-opacity:1;stroke-dashoffset:1;fill-opacity:0}${p(begin + 0.65)}{stroke-dashoffset:0;fill-opacity:0;stroke-opacity:1}${p(begin + 0.98)},100%{stroke-dashoffset:0;fill-opacity:1;stroke-opacity:0}}`}</style>
          </g>
        );
      })}
    </g>
  );
}

function Term({
  name,
  text,
  color = white,
  start = 1.5,
}: {
  name: string;
  text: string;
  color?: string;
  start?: number;
}) {
  return (
    <g data-manim-term={name} style={animation(name)}>
      <WrittenText text={text} size={108} color={color} start={start} name={`term-${name}`} />
    </g>
  );
}

function Note({
  text,
  name,
  start,
  end,
}: {
  text: string;
  name: string;
  start: number;
  end: number;
}) {
  return (
    <g transform="translate(500 480)">
      <g style={animation(name)}>
        <WrittenText
          text={text}
          size={31}
          start={start}
          stagger={0.014}
          name={name}
          color="#aeb3bb"
        />
        <style>{`@keyframes manim-${name}{0%,${p(end)}{opacity:1}${p(end + 0.2)},100%{opacity:0}}`}</style>
      </g>
    </g>
  );
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const h = frame === "portrait" ? 1480 : frame === "square" ? 1000 : 600;
  return (
    <Solo id={id} aspect={frame} duration={duration} background="#0b0c10">
      <svg
        viewBox={`0 0 1000 ${h}`}
        role="img"
        aria-label="Manim-style outline writing and a color-linked equation solving 2x plus 6 equals 14, ending at x equals 4"
        style={{
          position: "absolute",
          inset: "6%",
          width: "88%",
          height: "88%",
          overflow: "visible",
        }}
      >
        <g transform={`translate(0 ${(h - 600) / 2})`}>
          <g data-manim-scene style={animation("scene")}>
            <g transform="translate(500 125)">
              <WrittenText
                text="Keep the meaning."
                size={53}
                start={0.2}
                stagger={0.048}
                name="title"
              />
            </g>
            <g transform="translate(0 330)">
              <Term name="coefficient" text="2" start={1.55} />
              <Term name="variable" text="x" color={blue} start={1.68} />
              <g data-manim-term="operator" style={animation("operator")}>
                <path
                  d="M -22 -27 H 22"
                  fill="none"
                  stroke={gold}
                  strokeWidth="3.2"
                  pathLength={1}
                  strokeDasharray="1 1"
                  style={animation("operator-write")}
                />
                <g style={animation("plus-vertical")}>
                  <path
                    d="M 0 -49 V -5"
                    fill="none"
                    stroke={gold}
                    strokeWidth="3.2"
                    pathLength={1}
                    strokeDasharray="1 1"
                    style={animation("operator-write")}
                  />
                </g>
              </g>
              <Term name="constant" text="6" color={gold} start={1.95} />
              <Term name="equals" text="=" start={2.08} />
              <Term name="fourteen" text="14" start={2.2} />
              <Term name="eight" text="8" start={6.9} />
              <Term name="four" text="4" color={blue} start={9.1} />
              <g style={animation("division")} stroke={white} strokeWidth="1.6">
                <path d="M 300 23 H 422 M 606 23 H 694" />
                <g transform="translate(360 81)">
                  <WrittenText text="2" size={52} start={8.02} name="left-divisor" />
                </g>
                <g transform="translate(650 81)">
                  <WrittenText text="2" size={52} start={8.02} name="right-divisor" />
                </g>
              </g>
            </g>
            <path
              data-manim-underline
              d="M 365 359 H 511"
              fill="none"
              stroke={gold}
              strokeWidth="2"
              pathLength={1}
              strokeDasharray="1 1"
              style={animation("underline")}
            />
            <rect
              data-manim-box
              x="362"
              y="224"
              width="332"
              height="140"
              rx="3"
              fill="none"
              stroke={blue}
              strokeWidth="1.6"
              pathLength={1}
              strokeDasharray="1 1"
              style={animation("box")}
            />
            <Note text="subtract 6 from both sides" name="subtract-note" start={2.95} end={6.25} />
            <Note text="simplify" name="simplify-note" start={6.55} end={7.9} />
            <Note text="divide both sides by 2" name="divide-note" start={8.05} end={10.7} />
          </g>
        </g>
        <style>{`
        @keyframes manim-scene {0%,92%{opacity:1}99%,100%{opacity:0}}
        @keyframes manim-coefficient {0%,${p(6.65)}{transform:translate(230px,0);opacity:1;animation-timing-function:ease-in-out}${p(7.45)},${p(8.85)}{transform:translate(335px,0);opacity:1}${p(9.4)},100%{transform:translate(335px,30px);opacity:0}}
        @keyframes manim-variable {0%,${p(6.65)}{transform:translate(290px,0);animation-timing-function:ease-in-out}${p(7.45)},100%{transform:translate(402px,0)}}
        @keyframes manim-operator {0%,${p(4.05)}{transform:translate(390px,0);opacity:1;animation-timing-function:ease-in-out}${p(4.65)}{transform:translate(550px,90px);opacity:1;animation-timing-function:ease-in-out}${p(5.3)},${p(6.65)}{transform:translate(680px,0);opacity:1}${p(7.35)},100%{transform:translate(650px,0);opacity:0}}
        @keyframes manim-plus-vertical {0%,${p(4.1)}{transform:scaleY(1)}${p(4.65)},100%{transform:scaleY(0)}}
        @keyframes manim-operator-write {0%,${p(1.82)}{stroke-dashoffset:1}${p(2.25)},100%{stroke-dashoffset:0}}
        @keyframes manim-constant {0%,${p(4.05)}{transform:translate(490px,0);opacity:1;animation-timing-function:ease-in-out}${p(4.65)}{transform:translate(640px,-110px);opacity:1;animation-timing-function:ease-in-out}${p(5.3)},${p(6.65)}{transform:translate(790px,0);opacity:1}${p(7.35)},100%{transform:translate(680px,0);opacity:0}}
        @keyframes manim-equals {0%,${p(4.05)}{transform:translate(600px,0);animation-timing-function:ease-in-out}${p(5.3)},${p(6.65)}{transform:translate(450px,0);animation-timing-function:ease-in-out}${p(7.45)},100%{transform:translate(520px,0)}}
        @keyframes manim-fourteen {0%,${p(4.05)}{transform:translate(745px,0);opacity:1;animation-timing-function:ease-in-out}${p(5.3)},${p(6.65)}{transform:translate(550px,0);opacity:1}${p(7.35)},100%{transform:translate(620px,0);opacity:0}}
        @keyframes manim-eight {0%,${p(8.85)}{transform:translate(650px,0);opacity:1}${p(9.35)},100%{transform:translate(650px,-15px);opacity:0}}
        @keyframes manim-four {0%,100%{transform:translate(650px,0)}}
        @keyframes manim-division {0%,${p(7.9)}{opacity:0}${p(8.05)},${p(8.85)}{opacity:1}${p(9.4)},100%{opacity:0}}
        @keyframes manim-underline {0%,${p(3)}{stroke-dashoffset:1;opacity:1}${p(3.6)},${p(4.05)}{stroke-dashoffset:0;opacity:1}${p(4.3)},100%{stroke-dashoffset:0;opacity:0}}
        @keyframes manim-box {0%,${p(10.1)}{stroke-dashoffset:1}${p(10.75)},100%{stroke-dashoffset:0}}
      `}</style>
      </svg>
    </Solo>
  );
}
