import { useRef } from "react";
import gsap from "gsap";

export default function Card() {
  const modstest = [
    {
      name: "Friday Night Funkin': Mod Title that's very long but very very very long o sea we, bien largote",
      description:
        "Mod Description that's very long but very very very long o sea we, bien largote",
      img: "/assets/images/placeholder-mini.jpg",
      icon: "/assets/icons/categories/vslice.png",
    },
    {
      name: "Friday Night Funkin': Mod Title that's very long but very very very long o sea we, bien largote",
      description:
        "Mod Description that's very long but very very very long o sea we, bien largote",
      img: "/assets/images/placeholder-mini.jpg",
      icon: "/assets/icons/categories/vslice.png",
    },
    {
      name: "Friday Night Funkin': Mod Title that's very long but very very very long o sea we, bien largote",
      description:
        "Mod Description that's very long but very very very long o sea we, bien largote",
      img: "/assets/images/placeholder-mini.jpg",
      icon: "/assets/icons/categories/vslice.png",
    },
    {
      name: "Friday Night Funkin': Mod Title that's very long but very very very long o sea we, bien largote",
      description:
        "Mod Description that's very long but very very very long o sea we, bien largote",
      img: "/assets/images/placeholder-mini.jpg",
      icon: "/assets/icons/categories/vslice.png",
    },
    {
      name: "Friday Night Funkin': Mod Title that's very long but very very very long o sea we, bien largote",
      description:
        "Mod Description that's very long but very very very long o sea we, bien largote",
      img: "/assets/images/placeholder-mini.jpg",
      icon: "/assets/icons/categories/vslice.png",
    },
    {
      name: "Friday Night Funkin': Mod Title that's very long but very very very long o sea we, bien largote",
      description:
        "Mod Description that's very long but very very very long o sea we, bien largote",
      img: "/assets/images/placeholder-mini.jpg",
      icon: "/assets/icons/categories/vslice.png",
    },
    {
      name: "Friday Night Funkin': Mod Title that's very long but very very very long o sea we, bien largote",
      description:
        "Mod Description that's very long but very very very long o sea we, bien largote",
      img: "/assets/images/placeholder-mini.jpg",
      icon: "/assets/icons/categories/vslice.png",
    },
    {
      name: "Friday Night Funkin': Mod Title that's very long but very very very long o sea we, bien largote",
      description:
        "Mod Description that's very long but very very very long o sea we, bien largote",
      img: "/assets/images/placeholder-mini.jpg",
      icon: "/assets/icons/categories/vslice.png",
    },
    {
      name: "Friday Night Funkin': Mod Title that's very long but very very very long o sea we, bien largote",
      description:
        "Mod Description that's very long but very very very long o sea we, bien largote",
      img: "/assets/images/placeholder-mini.jpg",
      icon: "/assets/icons/categories/vslice.png",
    },
    {
      name: "Friday Night Funkin': Mod Title that's very long but very very very long o sea we, bien largote",
      description:
        "Mod Description that's very long but very very very long o sea we, bien largote",
      img: "/assets/images/placeholder-mini.jpg",
      icon: "/assets/icons/categories/vslice.png",
    },
    {
      name: "Friday Night Funkin': Mod Title that's very long but very very very long o sea we, bien largote",
      description:
        "Mod Description that's very long but very very very long o sea we, bien largote",
      img: "/assets/images/placeholder-mini.jpg",
      icon: "/assets/icons/categories/vslice.png",
    },
    {
      name: "Friday Night Funkin': Mod Title that's very long but very very very long o sea we, bien largote",
      description:
        "Mod Description that's very long but very very very long o sea we, bien largote",
      img: "/assets/images/placeholder-mini.jpg",
      icon: "/assets/icons/categories/vslice.png",
    },
    {
      name: "Friday Night Funkin': Mod Title that's very long but very very very long o sea we, bien largote",
      description:
        "Mod Description that's very long but very very very long o sea we, bien largote",
      img: "/assets/images/placeholder-mini.jpg",
      icon: "/assets/icons/categories/vslice.png",
    },
    {
      name: "Friday Night Funkin': Mod Title that's very long but very very very long o sea we, bien largote",
      description:
        "Mod Description that's very long but very very very long o sea we, bien largote",
      img: "/assets/images/placeholder-mini.jpg",
      icon: "/assets/icons/categories/vslice.png",
    },
    {
      name: "Friday Night Funkin': Mod Title that's very long but very very very long o sea we, bien largote",
      description:
        "Mod Description that's very long but very very very long o sea we, bien largote",
      img: "/assets/images/placeholder-mini.jpg",
      icon: "/assets/icons/categories/vslice.png",
    },
    {
      name: "Friday Night Funkin': Mod Title that's very long but very very very long o sea we, bien largote",
      description:
        "Mod Description that's very long but very very very long o sea we, bien largote",
      img: "/assets/images/placeholder-mini.jpg",
      icon: "/assets/icons/categories/vslice.png",
    },
  ];
  const cardRef = useRef<(HTMLDivElement | null)[]>([]);

  const onmouseenter = (index: number) => {
    gsap.to(cardRef.current[index], {
      scale: 1.05,
      duration: 0.3,
      ease: "power2.out",
    })
  }
  const onmouseleave = (index: number) => {
    gsap.to(cardRef.current[index], {
      scale: 1,
      duration: 0.3,
      ease: "power2.out",
    })
  }


  return (
    <div
      className="grid gap-12 -mx-8 sm:mx-6 h-auto w-auto "
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
    >
      {modstest.map((item, index) => (
        <div
          className=" relative shadow-2xs bg-transparent rounded-none sm:rounded-[1rem] p-0 sm:p-3 "
          style={{ fontFamily: "Manrope, sans-serif", fontWeight: 500 }}
        >
          <div className="relative aspect-[16/9]  overflow-hidden  w-full sm:rounded-t-[1rem] ">

            <div
              ref={(a) => { cardRef.current[index] = a }}
              key={index}
            
              onMouseEnter={() => onmouseenter(index)}
              onMouseLeave={() => onmouseleave(index)}
              className="absolute inset-0sm:rounded-t-[1rem]">
              <img
                className="w-full h-full object-cover block"
                src={item.img}

                style={{
                  WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
                  maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)"
                }}
              />

            </div>

            {/* Mask Container */}
            <div className="absolute left-0 top-0 w-[18%] aspect-square rounded-tl-none rounded-br-[8px] bg-[var(--wb-bg)] z-10">
              <div className="relative z-10 w-full h-full flex items-center justify-center p-2">
                <img
                  className="object-contain w-full h-full block"
                  src={item.icon}
                />
              </div>
              {/* Curva derecha */}
              <svg className="absolute top-0 left-full w-[8px] h-[8px] text-[var(--wb-bg)] pointer-events-none" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0 H8 A8 8 0 0 0 0 8 V0 Z" fill="currentColor" />
              </svg>
              {/* Curva inferior */}
              <svg className="absolute top-full left-0 w-[8px] h-[8px] text-[var(--wb-bg)] pointer-events-none" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0 H8 A8 8 0 0 0 0 8 V0 Z" fill="currentColor" />
              </svg>
            </div>
          </div>

          <div className="mt-4 px-0 sm:px-0 flex flex-col gap-1">
            <strong className="text-xl truncate block">{item.name}</strong>
            <h5 className="text-gray-400 text-sm truncate">{item.description}</h5>
          </div>
        </div>

      ))}
    </div>
  );
}
