export const FeatureCard = ({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) => (
  <div className="xl:w-1/3 lg:w-1/2 w-full">
    <div className="block pb-4 h-full rounded-xl  dark:border-neutral-800 bg-[#F6F6F7] dark:bg-[#202127] ">
      <div className="flex flex-col py-2 px-2 h-full">
        <div className="flex mt-4 ml-4 justify-center items-center w-9 h-9 text-lg bg-[#8E96AA] dark:bg-[#65758529] bg-opacity-[0.16] rounded-md">
          {icon}
        </div>
        <h2 className="text-sm mt-4 ml-3 mb-2 font-semibold break-words text-[#3C3C43] dark:text-white">{title}</h2>
        <p className="text-xs leading-4 ml-3 font-medium text-[#3C3C43] text-opacity-[78%] dark:text-gray-100">
          {description}
        </p>
      </div>
    </div>
  </div>
);
