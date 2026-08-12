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

  return (
    <div 
        className="grid gap-12 ml-6 mr-6 h-auto w-auto"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
    >
      {modstest.map((item, index) => (
        <div
          key={index}
          className=" relative shadow-2xs overflow-hidden bg-transparent rounded-md "
          style={{ fontFamily: "Manrope, sans-serif", fontWeight: 500 }}
        >
          <div className="relative aspect-[16/9] w-full">
            {/* Contenedor de la máscara */}
            <div className="absolute left-0 top-0 w-[18%] aspect-square bg-[var(--wb-bg)] z-10 rounded-br-2xl">
              {/* Expansión hacia afuera para forzar el recorte perfecto y eliminar el píxel d mrd */}
              <div className="absolute -top-[5px] -left-[5px] w-[20px] h-[20px] bg-[var(--wb-bg)]"></div>
              <div className="relative z-10 w-full h-full flex items-center justify-center p-[15%]">
                <img
                  className="object-contain w-full h-full block"
                  src={item.icon}
                />
              </div>
              {/* Curva derecha */}
              <div className="absolute top-0 left-full w-[35%] aspect-square overflow-hidden pointer-events-none">
                <div className="absolute bottom-0 right-0 w-full h-full bg-transparent rounded-tl-full shadow-[0_0_0_100px_var(--wb-bg)]"></div>
              </div>
              {/* Curva inferior */}
              <div className="absolute top-full left-0 w-[35%] aspect-square overflow-hidden pointer-events-none">
                <div className="absolute bottom-0 right-0 w-full h-full bg-transparent rounded-tl-full shadow-[0_0_0_100px_var(--wb-bg)]"></div>
              </div>
            </div>

            <img
              className="w-full h-full object-cover block"
              src={item.img}
              style={{
                WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
                maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)"
              }}
            />
          </div>

          <strong className="text-xl truncate block">{item.name}</strong>
          <h5 className="text-gray-400 text-sm truncate">{item.description}</h5>
        </div>
      ))}
    </div>
  );
}
