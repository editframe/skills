import { Link } from "react-router";

export const Elements = ({
  elements,
}: {
  elements: { name: string; href: string; gradient: string }[];
}) => {
  return (
    <div className="mt-8 grid grid-cols-1 gap-2 justify-center overflow-hidden rounded-2xl text-center sm:grid-cols-2 lg:grid-cols-3">
      {elements.map((element) => (
        <Link to={element.href} key={element.name}>
          <div
            className={`flex flex-col justify-center items-center p-8 bg-gradient-to-br ${element.gradient}`}
          >
            <div className="order-first text-lg  text-center font-semibold tracking-tight text-white">
              {element.name}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};
